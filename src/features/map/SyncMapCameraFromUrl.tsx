import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { mapParamsEqual } from '@/app/mapParam'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useMapLoaded } from '@/features/map/map-store'
import { getLastWrittenMapViewport } from '@/features/map/mapViewportSync'

export const SyncMapCameraFromUrl = () => {
  const { map } = useAppSearchNavigation()
  const maps = useMap()
  const mainMap = maps[MAIN_MAP_ID]
  const mapLoaded = useMapLoaded()

  useEffect(
    function syncCameraWithUrlViewport() {
      if (!mainMap || !mapLoaded) {
        return
      }

      const lastWritten = getLastWrittenMapViewport()
      if (lastWritten && mapParamsEqual(lastWritten, map)) {
        return
      }

      const mapInstance = mainMap.getMap()
      const center = mapInstance.getCenter()
      const zoom = mapInstance.getZoom()
      const bearing = mapInstance.getBearing()
      const pitch = mapInstance.getPitch()
      const alreadyThere =
        Math.abs(center.lat - map.lat) < 1e-5 &&
        Math.abs(center.lng - map.lng) < 1e-5 &&
        Math.abs(zoom - map.zoom) < 0.01 &&
        Math.abs(bearing - (map.bearing ?? 0)) < 0.05 &&
        Math.abs(pitch - (map.pitch ?? 0)) < 0.05
      if (alreadyThere) {
        return
      }

      mapInstance.jumpTo({
        center: [map.lng, map.lat],
        zoom: map.zoom,
        bearing: map.bearing ?? 0,
        pitch: map.pitch ?? 0,
      })
    },
    [mainMap, map, mapLoaded],
  )

  return null
}
