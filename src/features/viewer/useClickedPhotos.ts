import { useMemo } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { clickRadiusMeters } from '@/features/viewer/clickRadius'
import {
  distanceToPhoto,
  groupClickedPhotos,
  type PhotoSequenceGroup,
} from '@/features/viewer/groupClickedPhotos'

export type ClickedPhotosResult = {
  groups: PhotoSequenceGroup[]
  radiusMeters: number
  isLoading: boolean
  isFetching: boolean
}

export const useClickedPhotos = (): ClickedPhotosResult => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { clicked, providers, map, photoTypes, date } = search

  const {
    photos: allPhotos,
    isLoading,
    isFetching,
  } = useAllProviderPhotos(providers, bbox, map.z, photoTypes, date)
  const radiusMeters = clickRadiusMeters(map.z)

  const groups = useMemo(() => {
    if (!clicked) {
      return []
    }

    const nearby = allPhotos.filter(
      (photo) => distanceToPhoto(photo, clicked.lng, clicked.lat) <= radiusMeters,
    )

    return groupClickedPhotos(nearby, clicked.lng, clicked.lat)
  }, [allPhotos, clicked, radiusMeters])

  return { groups, radiusMeters, isLoading, isFetching }
}
