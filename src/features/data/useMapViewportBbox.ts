import { useMap } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useMapLoaded } from '@/features/map/map-store'
import type { Bbox } from '@/features/providers/model'

export const useMapViewportBbox = (): Bbox | null => {
  const { search } = useAppSearchNavigation()
  const { [MAIN_MAP_ID]: mapRef } = useMap()
  const mapLoaded = useMapLoaded()
  const { map } = search

  if (!mapRef || !mapLoaded) {
    return null
  }

  const bounds = mapRef.getBounds()
  if (!bounds) {
    return null
  }

  // Tie recomputation to URL viewport updates from onMoveEnd.
  void map

  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}
