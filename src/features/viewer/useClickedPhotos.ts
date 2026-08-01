import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import {
  fetchStreetViewMetadata,
  getGoogleMapsApiKey,
} from '@/features/providers/adapters/google-streetview'
import { clickRadiusMeters } from '@/features/viewer/clickRadius'
import {
  distanceToPhoto,
  groupClickedPhotos,
  type PhotoSequenceGroup,
} from '@/features/viewer/groupClickedPhotos'

export type GsvStatus = 'idle' | 'loading' | 'ok' | 'none' | 'no-key'

export type ClickedPhotosResult = {
  groups: PhotoSequenceGroup[]
  radiusMeters: number
  isLoading: boolean
  isFetching: boolean
  gsvStatus: GsvStatus
}

const streetViewMetadataQueryKey = (lng: number, lat: number) =>
  ['google-streetview-metadata', lng, lat] as const

export const useClickedPhotos = (): ClickedPhotosResult => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { clicked, providers, map, photoTypes, date } = search

  const {
    photos: allPhotos,
    isLoading: bboxPhotosLoading,
    isFetching: bboxPhotosFetching,
  } = useAllProviderPhotos(providers, bbox, map.z, photoTypes, date)
  const radiusMeters = clickRadiusMeters(map.z)

  const gsvEnabled = providers.includes('google-streetview')
  const googleMapsApiKey = getGoogleMapsApiKey()

  const streetViewQuery = useQuery({
    queryKey: clicked
      ? streetViewMetadataQueryKey(clicked.lng, clicked.lat)
      : ['google-streetview-metadata', 'none'],
    queryFn: ({ signal }) => {
      if (!clicked) {
        return null
      }
      return fetchStreetViewMetadata(clicked.lat, clicked.lng, signal)
    },
    enabled: gsvEnabled && clicked != null && googleMapsApiKey != null,
    staleTime: 5 * 60 * 1000,
  })

  const groups = useMemo(() => {
    if (!clicked) {
      return []
    }

    const nearby = allPhotos.filter(
      (photo) => distanceToPhoto(photo, clicked.lng, clicked.lat) <= radiusMeters,
    )

    const photos = streetViewQuery.data ? [...nearby, streetViewQuery.data] : nearby
    return groupClickedPhotos(photos, clicked.lng, clicked.lat)
  }, [allPhotos, clicked, radiusMeters, streetViewQuery.data])

  const gsvPending =
    gsvEnabled && clicked != null && googleMapsApiKey != null && streetViewQuery.isPending

  const gsvStatus = useMemo((): GsvStatus => {
    if (!gsvEnabled || clicked == null) {
      return 'idle'
    }
    if (googleMapsApiKey == null) {
      return 'no-key'
    }
    if (streetViewQuery.isPending) {
      return 'loading'
    }
    if (streetViewQuery.data) {
      return 'ok'
    }
    if (streetViewQuery.isFetched) {
      return 'none'
    }
    return 'idle'
  }, [
    clicked,
    googleMapsApiKey,
    gsvEnabled,
    streetViewQuery.data,
    streetViewQuery.isFetched,
    streetViewQuery.isPending,
  ])

  return {
    groups,
    radiusMeters,
    isLoading: bboxPhotosLoading || gsvPending,
    isFetching: bboxPhotosFetching || streetViewQuery.isFetching,
    gsvStatus,
  }
}
