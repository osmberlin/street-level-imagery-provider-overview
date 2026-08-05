import { useRef } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { useMap } from 'react-map-gl/maplibre'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useMapLoaded } from '@/features/map/map-store'

export const useStableMainMapRefs = () => {
  const maps = useMap()
  const mainMap = maps[MAIN_MAP_ID]
  const mapLoaded = useMapLoaded()
  const mainMapRef = useRef<MapRef | undefined>(undefined)
  const mapLoadedRef = useRef(false)

  mainMapRef.current = mainMap
  mapLoadedRef.current = mapLoaded

  return { mainMap, mapLoaded, mainMapRef, mapLoadedRef }
}

export const useEaseMainMapToPoint = () => {
  const { mainMapRef, mapLoadedRef } = useStableMainMapRefs()

  return (lng: number, lat: number) => {
    const mapInstance = mainMapRef.current?.getMap()
    if (mapInstance && mapLoadedRef.current && !mapInstance.getBounds().contains([lng, lat])) {
      mapInstance.easeTo({ center: [lng, lat] })
    }
  }
}
