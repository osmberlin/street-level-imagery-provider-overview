import { useMemo } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderMapFeatures } from '@/features/data/useAllProviderMapFeatures'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import type { NormalizedMapFeature } from '@/features/providers/model'
import { haversineDistanceMeters, clickRadiusMeters } from '@/features/viewer/clickRadius'

export type ClickedMapFeature = NormalizedMapFeature & {
  distanceMeters: number
}

export const useClickedMapFeatures = (): ClickedMapFeature[] => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { clicked, providers, map, date } = search

  const allFeatures = useAllProviderMapFeatures(providers, bbox, map.z, date)
  const radiusMeters = clickRadiusMeters(map.z)

  return useMemo(() => {
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
  }, [allFeatures, clicked, radiusMeters])
}
