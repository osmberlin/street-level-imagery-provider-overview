import type { NormalizedMapFeature } from '@osm-editor-kit/street-imagery'
import { haversineDistanceMeters, clickRadiusMeters } from '@osm-editor-kit/street-imagery'
import { useAllProviderMapFeatures } from '@osm-editor-kit/street-imagery-react'
import { useMapViewportBbox } from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'

export type ClickedMapFeature = NormalizedMapFeature & {
  distanceMeters: number
}

export const useClickedMapFeatures = (): ClickedMapFeature[] => {
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const { clicked, providers, date } = search

  const allFeatures = useAllProviderMapFeatures(providers, bbox, map.zoom, date)
  const radiusMeters = clickRadiusMeters(map.zoom)

  if (!clicked) {
    return []
  }

  return allFeatures
    .map((feature) => ({
      ...feature,
      distanceMeters: haversineDistanceMeters(
        clicked.lng,
        clicked.lat,
        feature.lngLat[0],
        feature.lngLat[1],
      ),
    }))
    .filter((feature) => feature.distanceMeters <= radiusMeters)
    .sort((left, right) => {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters
      }
      return left.featureId.localeCompare(right.featureId)
    })
}
