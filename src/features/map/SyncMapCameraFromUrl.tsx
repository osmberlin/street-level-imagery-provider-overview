import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useMapLoaded } from '@/features/map/map-store'
import { getLastWrittenMapViewport } from '@/features/map/mapViewportSync'

export const SyncMapCameraFromUrl = () => {
  const { search } = useAppSearchNavigation()
  const { map } = search
  const maps = useMap()
  const mainMap = maps[MAIN_MAP_ID]
  const mapLoaded = useMapLoaded()

  useEffect(
    function syncCameraWithUrlViewport() {
      if (!mainMap || !mapLoaded) {
        return
      }

      const lastWritten = getLastWrittenMapViewport()
      if (
        lastWritten &&
        lastWritten.lat === map.lat &&
        lastWritten.lng === map.lng &&
        lastWritten.zoom === map.zoom
      ) {
        return
      }

      const mapInstance = mainMap.getMap()
      const center = mapInstance.getCenter()
      const zoom = mapInstance.getZoom()
      const alreadyThere =
        Math.abs(center.lat - map.lat) < 1e-5 &&
        Math.abs(center.lng - map.lng) < 1e-5 &&
        Math.abs(zoom - map.zoom) < 0.01
      if (alreadyThere) {
        return
      }

      mapInstance.jumpTo({ center: [map.lng, map.lat], zoom: map.zoom })
    },
    [mainMap, map.lat, map.lng, map.zoom, mapLoaded],
  )

  return null
}
