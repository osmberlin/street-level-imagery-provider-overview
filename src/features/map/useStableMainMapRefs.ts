import { useMap } from 'react-map-gl/maplibre'
import { MAIN_MAP_ID } from '@/features/map/constants'

/** Stable per map instance (React Compiler memoizes on `mainMap`), so viewer effects don't re-init. */
export const useEaseMainMapToPoint = () => {
  const mainMap = useMap()[MAIN_MAP_ID]

  return (lng: number, lat: number) => {
    const mapInstance = mainMap?.getMap()
    if (mapInstance?.isStyleLoaded() && !mapInstance.getBounds().contains([lng, lat])) {
      mapInstance.easeTo({ center: [lng, lat] })
    }
  }
}
