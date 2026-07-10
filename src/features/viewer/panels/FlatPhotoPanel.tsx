import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { NormalizedPhoto } from '@/features/providers/model'
import { usePhotoFullUrl } from '@/features/viewer/photoThumbnails'
import { useViewerActions } from '@/features/viewer/useViewerStore'

const MIN_SCALE = 1
const MAX_SCALE = 8
const ZOOM_STEP = 1.5

const getContainedImageSize = (
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
) => {
  if (!naturalWidth || !naturalHeight || !containerWidth || !containerHeight) {
    return { width: 0, height: 0 }
  }

  const imageAspect = naturalWidth / naturalHeight
  const containerAspect = containerWidth / containerHeight

  if (imageAspect > containerAspect) {
    return {
      width: containerWidth,
      height: containerWidth / imageAspect,
    }
  }

  return {
    width: containerHeight * imageAspect,
    height: containerHeight,
  }
}

type FlatPhotoPanelProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

const FlatPhotoViewer = ({ photo }: { photo: NormalizedPhoto }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const transformRef = useRef({ x: 0, y: 0, scale: MIN_SCALE })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [scale, setScale] = useState(MIN_SCALE)
  const [isDragging, setIsDragging] = useState(false)
  const { data: imageUrl, isLoading, isError } = usePhotoFullUrl(photo)
  const actions = useViewerActions()

  useEffect(
    function resetViewerStoreOnMount() {
      actions.reset()
      return () => {
        actions.reset()
      }
    },
    [actions, photo.photoId, photo.providerId],
  )

  const applyTransform = useCallback(() => {
    const image = imageRef.current
    if (!image) {
      return
    }
    const { x, y, scale: currentScale } = transformRef.current
    image.style.transform = `translate(${x}px, ${y}px) scale(${currentScale})`
  }, [])

  const clampTransform = useCallback(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) {
      return
    }

    const { scale: currentScale } = transformRef.current
    const containerRect = container.getBoundingClientRect()
    const naturalWidth = image.naturalWidth
    const naturalHeight = image.naturalHeight
    if (!naturalWidth || !naturalHeight) {
      return
    }

    const contained = getContainedImageSize(
      containerRect.width,
      containerRect.height,
      naturalWidth,
      naturalHeight,
    )
    const scaledWidth = contained.width * currentScale
    const scaledHeight = contained.height * currentScale
    const maxX = scaledWidth <= containerRect.width ? 0 : (scaledWidth - containerRect.width) / 2
    const maxY =
      scaledHeight <= containerRect.height ? 0 : (scaledHeight - containerRect.height) / 2

    transformRef.current.x = Math.min(maxX, Math.max(-maxX, transformRef.current.x))
    transformRef.current.y = Math.min(maxY, Math.max(-maxY, transformRef.current.y))
    applyTransform()
  }, [applyTransform])

  const updateScale = useCallback(
    (nextScale: number) => {
      transformRef.current.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
      if (transformRef.current.scale <= MIN_SCALE) {
        transformRef.current.x = 0
        transformRef.current.y = 0
      }
      setScale(transformRef.current.scale)
      clampTransform()
    },
    [clampTransform],
  )

  const resetTransform = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: MIN_SCALE }
    setScale(MIN_SCALE)
    applyTransform()
  }, [applyTransform])

  useEffect(
    function observeContainerResize() {
      const container = containerRef.current
      if (!container) {
        return
      }

      const resizeObserver = new ResizeObserver(() => {
        clampTransform()
      })
      resizeObserver.observe(container)

      return () => {
        resizeObserver.disconnect()
      }
    },
    [clampTransform],
  )

  useEffect(
    function attachNonPassiveWheelHandler() {
      const container = containerRef.current
      if (!container) {
        return
      }

      const onWheel = (event: WheelEvent) => {
        if (!imageUrl) {
          return
        }
        event.preventDefault()
        const delta = event.deltaY > 0 ? 0.9 : 1.1
        updateScale(transformRef.current.scale * delta)
      }

      container.addEventListener('wheel', onWheel, { passive: false })

      return () => {
        container.removeEventListener('wheel', onWheel)
      }
    },
    [imageUrl, updateScale],
  )

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!imageUrl || scale <= MIN_SCALE) {
      return
    }
    setIsDragging(true)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    transformRef.current.x = drag.originX + (event.clientX - drag.startX)
    transformRef.current.y = drag.originY + (event.clientY - drag.startY)
    clampTransform()
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onDoubleClick = () => {
    resetTransform()
  }

  const isPannable = scale > MIN_SCALE
  const imageCursor = isDragging ? 'cursor-grabbing' : isPannable ? 'cursor-grab' : 'cursor-default'

  return (
    <div
      ref={containerRef}
      className="relative min-h-48 touch-none overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
      style={{ aspectRatio: '4 / 3' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          Loading image…
        </div>
      ) : imageUrl ? (
        <img
          ref={imageRef}
          alt="Street-level photo"
          className={`mx-auto h-full w-full max-w-none object-contain ${imageCursor}`}
          draggable={false}
          src={imageUrl}
          onLoad={clampTransform}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-300">
          {isError ? 'Image unavailable' : 'No image for this photo'}
        </div>
      )}

      {imageUrl ? (
        <div className="absolute right-2 bottom-2 flex flex-col gap-1 rounded-md bg-black/50 p-1 backdrop-blur-sm">
          <button
            aria-label="Zoom in"
            className="flex size-7 items-center justify-center rounded text-sm font-medium text-white hover:bg-white/20 disabled:opacity-40"
            disabled={scale >= MAX_SCALE}
            type="button"
            onClick={() => {
              updateScale(transformRef.current.scale * ZOOM_STEP)
            }}
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            className="flex size-7 items-center justify-center rounded text-sm font-medium text-white hover:bg-white/20 disabled:opacity-40"
            disabled={scale <= MIN_SCALE}
            type="button"
            onClick={() => {
              updateScale(transformRef.current.scale / ZOOM_STEP)
            }}
          >
            −
          </button>
          <button
            aria-label="Reset zoom"
            className="flex size-7 items-center justify-center rounded text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40"
            disabled={scale <= MIN_SCALE}
            type="button"
            onClick={resetTransform}
          >
            ⟲
          </button>
        </div>
      ) : null}
    </div>
  )
}

export const FlatPhotoPanel = ({ photo }: FlatPhotoPanelProps) => (
  <FlatPhotoViewer key={photo.photoId} photo={photo} />
)
