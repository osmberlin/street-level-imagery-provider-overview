import { type PanoData, type PanoDataProvider, Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'
import {
  events,
  VirtualTourPlugin,
  type VirtualTourNode,
} from '@photo-sphere-viewer/virtual-tour-plugin'
import { useEffect, useRef, useState } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useEaseMainMapToPoint } from '@/features/map/useStableMainMapRefs'
import { useViewerActions } from '@/street-imagery-react/useViewerStore'
import type { NormalizedPhoto } from '@/street-imagery/providers/model'
import { resolvePhotoPanoramaUrl } from '@/street-imagery/viewer/photoThumbnails'

const normalizeBearing = (degrees: number) => ((degrees % 360) + 360) % 360

const radToDeg = (radians: number) => (radians * 180) / Math.PI

const buildPanoData = (heading: number | null): PanoData | PanoDataProvider => {
  const poseHeading = heading ?? 0
  return (image, xmp) => ({
    fullWidth: xmp?.fullWidth ?? image.naturalWidth ?? 4000,
    fullHeight: xmp?.fullHeight ?? image.naturalHeight,
    croppedWidth: xmp?.croppedWidth,
    croppedHeight: xmp?.croppedHeight,
    croppedX: xmp?.croppedX ?? 0,
    croppedY: xmp?.croppedY ?? 0,
    poseHeading: xmp?.poseHeading ?? poseHeading,
  })
}

const buildTourNodes = async (
  photos: NormalizedPhoto[],
): Promise<{ nodes: VirtualTourNode[]; photoById: Map<string, NormalizedPhoto> }> => {
  const panoPhotos = photos.filter((entry) => entry.isPano === true)
  const resolved = await Promise.all(
    panoPhotos.map(async (entry) => ({
      photo: entry,
      panorama: await resolvePhotoPanoramaUrl(entry),
    })),
  )

  const photoById = new Map<string, NormalizedPhoto>()
  const nodes: VirtualTourNode[] = []

  for (const { photo, panorama } of resolved) {
    if (!panorama) {
      continue
    }

    photoById.set(photo.photoId, photo)
    nodes.push({
      id: photo.photoId,
      panorama,
      gps: [photo.lngLat[0], photo.lngLat[1]],
      panoData: buildPanoData(photo.heading),
      thumbnail: photo.thumbUrl,
      data: { photo },
      links: [],
    })
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!node) {
      continue
    }
    const links = node.links ?? []

    if (index > 0) {
      const prev = nodes[index - 1]
      if (prev) {
        links.push({
          nodeId: prev.id,
          gps: prev.gps,
        })
      }
    }
    if (index < nodes.length - 1) {
      const next = nodes[index + 1]
      if (next) {
        links.push({
          nodeId: next.id,
          gps: next.gps,
        })
      }
    }

    node.links = links
  }

  return { nodes, photoById }
}

type PsvPanoPanelProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

export const PsvPanoPanel = ({ photo, groupPhotos }: PsvPanoPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const virtualTourRef = useRef<VirtualTourPlugin | null>(null)
  const lastViewerPhotoIdRef = useRef<string | null>(null)
  const readyRef = useRef(false)
  const pendingNodeIdRef = useRef<string | null>(null)
  const photoRef = useRef(photo)
  const groupPhotosRef = useRef(groupPhotos)
  const photoByIdRef = useRef<Map<string, NormalizedPhoto>>(new Map())
  const builtNodeIdsRef = useRef<Set<string>>(new Set())
  const bearingRafRef = useRef<number | null>(null)
  const pendingBearingRef = useRef<number | null>(null)
  const pendingHfovRef = useRef<number | null>(null)
  const currentHeadingRef = useRef<number | null>(photo.heading)
  const [isLoading, setIsLoading] = useState(true)
  const { updateSelected } = useAppSearchNavigation()
  const actions = useViewerActions()
  const easeMainMapToPoint = useEaseMainMapToPoint()
  const initialPhotoIdRef = useRef(photo.photoId)

  useEffect(
    function syncPhotoRef() {
      photoRef.current = photo
      groupPhotosRef.current = groupPhotos
      currentHeadingRef.current = photo.heading
    },
    [groupPhotos, photo],
  )

  useEffect(
    function resetViewerStoreOnProviderChange() {
      return () => {
        actions.reset()
      }
    },
    [actions, photo.providerId],
  )

  useEffect(
    function mountPsvViewer() {
      let cancelled = false

      const setup = async () => {
        const container = containerRef.current
        if (!container) {
          return
        }

        const { nodes, photoById } = await buildTourNodes(groupPhotosRef.current)
        if (cancelled) {
          return
        }

        photoByIdRef.current = photoById
        builtNodeIdsRef.current = new Set(nodes.map((node) => node.id))

        const startNodeId = nodes.some((node) => node.id === initialPhotoIdRef.current)
          ? initialPhotoIdRef.current
          : nodes[0]?.id

        if (!startNodeId || nodes.length === 0) {
          setIsLoading(false)
          return
        }

        const viewer = new Viewer({
          container,
          navbar: false,
          plugins: [
            VirtualTourPlugin.withConfig({
              positionMode: 'gps',
              renderMode: '3d',
              nodes,
              startNodeId,
            }),
          ],
        })

        const virtualTour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin)
        viewerRef.current = viewer
        virtualTourRef.current = virtualTour
        lastViewerPhotoIdRef.current = startNodeId
        setIsLoading(false)

        const flushPov = () => {
          bearingRafRef.current = null
          if (pendingBearingRef.current != null) {
            actions.setPov({ bearing: pendingBearingRef.current })
            pendingBearingRef.current = null
          }
          if (pendingHfovRef.current != null) {
            actions.setPov({ hfov: pendingHfovRef.current })
            pendingHfovRef.current = null
          }
        }

        const schedulePovUpdate = () => {
          const heading = currentHeadingRef.current ?? 0
          const position = viewer.getPosition()
          pendingBearingRef.current = normalizeBearing(heading + radToDeg(position.yaw))
          const vFov = viewer.dataHelper.zoomLevelToFov(viewer.getZoomLevel())
          pendingHfovRef.current = viewer.dataHelper.vFovToHFov(vFov)

          if (bearingRafRef.current == null) {
            bearingRafRef.current = requestAnimationFrame(flushPov)
          }
        }

        const onNodeChanged = (event: InstanceType<typeof events.NodeChangedEvent>) => {
          const nodeId = event.node.id
          lastViewerPhotoIdRef.current = nodeId

          const nodePhoto =
            photoByIdRef.current.get(nodeId) ??
            (event.node.data?.photo as NormalizedPhoto | undefined) ??
            photoRef.current

          currentHeadingRef.current = nodePhoto.heading

          updateSelected({
            provider: nodePhoto.providerId,
            sequenceId: nodePhoto.sequenceId ?? undefined,
            photoId: nodeId,
          })

          actions.setPov({ lngLat: nodePhoto.lngLat })
          easeMainMapToPoint(nodePhoto.lngLat[0], nodePhoto.lngLat[1])
          schedulePovUpdate()
        }

        const onPositionUpdated = () => {
          schedulePovUpdate()
        }

        const onZoomUpdated = () => {
          schedulePovUpdate()
        }

        virtualTour.addEventListener(events.NodeChangedEvent.type, onNodeChanged)
        viewer.addEventListener('position-updated', onPositionUpdated)
        viewer.addEventListener('zoom-updated', onZoomUpdated)

        const resizeObserver = new ResizeObserver(() => {
          viewer.autoSize()
        })
        resizeObserver.observe(container)

        readyRef.current = true

        const safeSetCurrentNode = (nodeId: string) => {
          if (!builtNodeIdsRef.current.has(nodeId)) {
            return
          }
          void virtualTour.setCurrentNode(nodeId).catch(() => {})
        }

        const pendingNodeId = pendingNodeIdRef.current
        if (pendingNodeId) {
          pendingNodeIdRef.current = null
          safeSetCurrentNode(pendingNodeId)
        } else {
          schedulePovUpdate()
        }

        return () => {
          readyRef.current = false
          if (bearingRafRef.current != null) {
            cancelAnimationFrame(bearingRafRef.current)
            bearingRafRef.current = null
          }
          resizeObserver.disconnect()
          virtualTour.removeEventListener(events.NodeChangedEvent.type, onNodeChanged)
          viewer.removeEventListener('position-updated', onPositionUpdated)
          viewer.removeEventListener('zoom-updated', onZoomUpdated)
          viewer.destroy()
          viewerRef.current = null
          virtualTourRef.current = null
        }
      }

      let cleanup: (() => void) | undefined

      void setup().then((dispose) => {
        cleanup = dispose
      })

      return () => {
        cancelled = true
        cleanup?.()
      }
    },
    [actions, easeMainMapToPoint, updateSelected],
  )

  useEffect(
    function syncExternalPhotoSelection() {
      const virtualTour = virtualTourRef.current
      if (!virtualTour || photo.photoId === lastViewerPhotoIdRef.current) {
        return
      }

      actions.reset()

      if (!readyRef.current) {
        if (builtNodeIdsRef.current.size > 0 && !builtNodeIdsRef.current.has(photo.photoId)) {
          return
        }
        pendingNodeIdRef.current = photo.photoId
        lastViewerPhotoIdRef.current = photo.photoId
        currentHeadingRef.current = photo.heading
        return
      }

      if (!builtNodeIdsRef.current.has(photo.photoId)) {
        return
      }

      lastViewerPhotoIdRef.current = photo.photoId
      currentHeadingRef.current = photo.heading
      void virtualTour.setCurrentNode(photo.photoId).catch(() => {})
    },
    [actions, photo.heading, photo.photoId],
  )

  return (
    <div
      className="relative min-h-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
      style={{ aspectRatio: '4 / 3' }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm text-slate-300">
          Loading panorama…
        </div>
      ) : null}
    </div>
  )
}
