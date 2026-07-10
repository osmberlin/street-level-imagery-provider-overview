import { useEffect, useRef } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useMainMapRef, getMainMapRef } from '@/features/map/useMainMapRef'
import type { NormalizedPhoto } from '@/features/providers/model'
import type {
  PnxPhotoViewerElement,
  PnxPictureLoadedEventDetail,
  PnxSelectEventDetail,
  PnxViewRotatedEventDetail,
} from '@/features/viewer/panels/panoramax-photo-viewer.d'
import { useViewerActions } from '@/features/viewer/useViewerStore'

const PANORAMAX_API_ENDPOINT = 'https://api.panoramax.xyz/api'

const normalizeBearing = (degrees: number) => ((degrees % 360) + 360) % 360

type PanoramaxPanelProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

type PendingSelect = {
  sequenceId: string | null
  photoId: string
}

export const PanoramaxPanel = ({ photo }: PanoramaxPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PnxPhotoViewerElement>(null)
  const lastViewerPhotoIdRef = useRef<string | null>(null)
  const readyRef = useRef(false)
  const pendingSelectRef = useRef<PendingSelect | null>(null)
  const photoRef = useRef(photo)
  const bearingRafRef = useRef<number | null>(null)
  const pendingBearingRef = useRef<number | null>(null)
  const pendingHfovRef = useRef<number | null>(null)
  const { updateSelected } = useAppSearchNavigation()
  const actions = useViewerActions()
  useMainMapRef()
  const initialPhotoIdRef = useRef(photo.photoId)
  const initialSequenceIdRef = useRef(photo.sequenceId)

  useEffect(
    function syncPhotoRef() {
      photoRef.current = photo
    },
    [photo],
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
    function mountPanoramaxViewer() {
      let cancelled = false

      const setup = async () => {
        await import('@panoramax/web-viewer')
        if (cancelled) {
          return
        }

        const viewer = viewerRef.current
        const container = containerRef.current
        if (!viewer || !container) {
          return
        }

        viewer.endpoint = PANORAMAX_API_ENDPOINT
        viewer['url-parameters'] = 'false'
        viewer.picture = initialPhotoIdRef.current
        viewer.sequence = initialSequenceIdRef.current ?? null
        lastViewerPhotoIdRef.current = initialPhotoIdRef.current

        const easeMapToPhoto = (lon: number, lat: number) => {
          const mapInstance = getMainMapRef().current?.getMap()
          if (mapInstance && !mapInstance.getBounds().contains([lon, lat])) {
            mapInstance.easeTo({ center: [lon, lat] })
          }
        }

        const flushBearing = () => {
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

        const onSelect = (event: Event) => {
          const { seqId, picId } = (event as CustomEvent<PnxSelectEventDetail>).detail
          if (!picId) {
            return
          }

          lastViewerPhotoIdRef.current = picId

          const currentPhoto = photoRef.current
          const sequenceId =
            seqId ??
            (picId === currentPhoto.photoId && currentPhoto.sequenceId
              ? currentPhoto.sequenceId
              : `photo:${picId}`)

          updateSelected({
            provider: 'panoramax',
            sequenceId,
            photoId: picId,
          })
        }

        const onPictureLoaded = (event: Event) => {
          const detail = (event as CustomEvent<PnxPictureLoadedEventDetail>).detail
          if (detail.lon == null || detail.lat == null) {
            return
          }

          actions.setPov({ lngLat: [detail.lon, detail.lat] })

          if (detail.x != null) {
            actions.setPov({ bearing: normalizeBearing(detail.x) })
          }

          const psv = viewer.psv
          if (psv && detail.z != null) {
            actions.setPov({ hfov: psv.dataHelper.zoomLevelToFov(detail.z) })
          }

          easeMapToPhoto(detail.lon, detail.lat)
        }

        const onViewRotated = (event: Event) => {
          const detail = (event as CustomEvent<PnxViewRotatedEventDetail>).detail
          pendingBearingRef.current = normalizeBearing(detail.x)

          const psv = viewer.psv
          if (psv && detail.z != null) {
            pendingHfovRef.current = psv.dataHelper.zoomLevelToFov(detail.z)
          }

          if (bearingRafRef.current == null) {
            bearingRafRef.current = requestAnimationFrame(flushBearing)
          }
        }

        viewer.addEventListener('select', onSelect)
        viewer.addEventListener('psv:picture-loaded', onPictureLoaded)
        viewer.addEventListener('psv:view-rotated', onViewRotated)

        const resizeObserver = new ResizeObserver(() => {
          viewer.psv?.resize()
        })
        resizeObserver.observe(container)

        readyRef.current = true

        const pending = pendingSelectRef.current
        if (pending) {
          pendingSelectRef.current = null
          if (typeof viewer.select === 'function') {
            viewer.select(pending.sequenceId ?? null, pending.photoId)
          }
        }

        return () => {
          readyRef.current = false
          if (bearingRafRef.current != null) {
            cancelAnimationFrame(bearingRafRef.current)
            bearingRafRef.current = null
          }
          resizeObserver.disconnect()
          viewer.removeEventListener('select', onSelect)
          viewer.removeEventListener('psv:picture-loaded', onPictureLoaded)
          viewer.removeEventListener('psv:view-rotated', onViewRotated)
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
    [actions, updateSelected],
  )

  useEffect(
    function syncExternalPhotoSelection() {
      const viewer = viewerRef.current
      if (!viewer || photo.photoId === lastViewerPhotoIdRef.current) {
        return
      }

      actions.reset()

      lastViewerPhotoIdRef.current = photo.photoId

      if (!readyRef.current) {
        pendingSelectRef.current = { sequenceId: photo.sequenceId, photoId: photo.photoId }
        return
      }

      if (typeof viewer.select === 'function') {
        viewer.select(photo.sequenceId ?? null, photo.photoId)
      }
    },
    [actions, photo.photoId, photo.sequenceId],
  )

  return (
    <div
      ref={containerRef}
      className="min-h-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
      style={{ aspectRatio: '4 / 3' }}
    >
      <pnx-photo-viewer ref={viewerRef} className="block h-full w-full" />
    </div>
  )
}
