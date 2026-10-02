import { useMap } from 'react-map-gl/maplibre'
import { MAIN_MAP_ID } from '@/features/map/constants'

const MARGIN_PX = 24

/** Floating photo viewer rect relative to the map canvas, if it is open. */
const floatingViewerRect = (canvas: HTMLCanvasElement) => {
  const viewer = document.querySelector('section[aria-label="Photo viewer"]')
  if (!viewer) {
    return null
  }
  const box = viewer.getBoundingClientRect()
  const map = canvas.getBoundingClientRect()
  return { left: box.left - map.left, top: box.top - map.top, right: box.right - map.left }
}

/**
 * Pan the map so a point is visible and not hidden behind the floating photo viewer.
 * Stable per map instance (React Compiler memoizes on `mainMap`), so viewer effects don't re-init.
 */
export const useEaseMainMapToPoint = () => {
  const mainMap = useMap()[MAIN_MAP_ID]

  return (lng: number, lat: number) => {
    const mapInstance = mainMap?.getMap()
    if (!mapInstance?.isStyleLoaded()) {
      return
    }
    const canvas = mapInstance.getCanvas()
    const { width, height } = canvas.getBoundingClientRect()
    const point = mapInstance.project([lng, lat])
    const box = floatingViewerRect(canvas)
    const outsideMap =
      point.x < MARGIN_PX ||
      point.y < MARGIN_PX ||
      point.x > width - MARGIN_PX ||
      point.y > height - MARGIN_PX
    const underViewer =
      box != null && point.x > box.left - MARGIN_PX && point.y > box.top - MARGIN_PX
    if (!outsideMap && !underViewer) {
      return
    }
    // Center the point in the map area left of the viewer.
    const freeWidth = box ? Math.max(box.left, width / 3) : width
    mapInstance.easeTo({ center: [lng, lat], offset: [(freeWidth - width) / 2, 0] })
  }
}
