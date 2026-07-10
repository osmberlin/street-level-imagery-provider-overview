import type { PanoData, PanoDataProvider, Viewer } from '@photo-sphere-viewer/core'
import type { VirtualTourNode, VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { useEffect, useRef, useState } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useMainMapRef, getMainMapRef } from '@/features/map/useMainMapRef'
import type { NormalizedPhoto } from '@/features/providers/model'
import { haversineDistanceMeters } from '@/features/viewer/clickRadius'
import { photoGroupSequenceId } from '@/features/viewer/groupClickedPhotos'
import { buildStreetsidePanoramaConfig } from '@/features/viewer/streetsideCubemap'
import { useViewerActions } from '@/features/viewer/useViewerStore'

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

const buildTourNodes = (
  photos: NormalizedPhoto[],
): { nodes: VirtualTourNode[]; photoById: Map<string, NormalizedPhoto> } => {
  const photoById = new Map<string, NormalizedPhoto>()
  const nodes: VirtualTourNode[] = []

  for (const entry of photos) {
    const panorama = buildStreetsidePanoramaConfig(entry)
    if (!panorama) {
      continue
    }

    photoById.set(entry.photoId, entry)
    nodes.push({
      id: entry.photoId,
      panorama,
      gps: [entry.lngLat[0], entry.lngLat[1]],
      panoData: buildPanoData(entry.heading),
      thumbnail: entry.thumbUrl,
      data: { photo: entry },
      links: [],
    })
  }

  const maxLinksPerNode = 3

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!node?.gps) {
      continue
    }

    const neighbors: { index: number; distance: number }[] = []
    for (let otherIndex = 0; otherIndex < nodes.length; otherIndex += 1) {
      if (otherIndex === index) {
        continue
      }
      const other = nodes[otherIndex]
      if (!other?.gps) {
        continue
      }
      neighbors.push({
        index: otherIndex,
        distance: haversineDistanceMeters(node.gps[0], node.gps[1], other.gps[0], other.gps[1]),
      })
    }

    neighbors.sort((left, right) => left.distance - right.distance)
    node.links = neighbors.slice(0, maxLinksPerNode).map(({ index: neighborIndex }) => {
      const target = nodes[neighborIndex]
      return {
        nodeId: target!.id,
        gps: target!.gps,
      }
    })
  }

  return { nodes, photoById }
}

type StreetsidePanelProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

export const StreetsidePanel = ({ photo, groupPhotos }: StreetsidePanelProps) => {
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
  useMainMapRef()
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
    function mountStreetsideViewer() {
      let cancelled = false

      const setup = async () => {
        const [{ Viewer }, { CubemapTilesAdapter }, { VirtualTourPlugin, events }] =
          await Promise.all([
            import('@photo-sphere-viewer/core'),
            import('@photo-sphere-viewer/cubemap-tiles-adapter'),
            import('@photo-sphere-viewer/virtual-tour-plugin'),
            import('@photo-sphere-viewer/core/index.css'),
          ])

        if (cancelled) {
          return
        }

        const container = containerRef.current
        if (!container) {
          return
        }

        const { nodes, photoById } = buildTourNodes(groupPhotosRef.current)
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
          adapter: CubemapTilesAdapter,
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

        const easeMapToPhoto = (lng: number, lat: number) => {
          const mapInstance = getMainMapRef().current?.getMap()
          if (mapInstance && !mapInstance.getBounds().contains([lng, lat])) {
            mapInstance.easeTo({ center: [lng, lat] })
          }
        }

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
            sequenceId: photoGroupSequenceId(nodePhoto),
            photoId: nodeId,
          })

          actions.setPov({ lngLat: nodePhoto.lngLat })
          easeMapToPhoto(nodePhoto.lngLat[0], nodePhoto.lngLat[1])
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
    [actions, updateSelected],
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
