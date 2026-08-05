import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { photoMatchesFilters } from '@/features/filters/searchFilters'
import { getGoogleMapsApiKey } from '@/features/providers/adapters/google-streetview'
import { clickRadiusMeters } from '@/features/viewer/clickRadius'
import {
  distanceToPhoto,
  groupClickedPhotos,
  type PhotoSequenceGroup,
} from '@/features/viewer/groupClickedPhotos'
import { useGoogleStreetViewClickPhoto } from '@/features/viewer/useGoogleStreetViewClickPhoto'

export type GsvStatus = 'idle' | 'loading' | 'ok' | 'none' | 'no-key' | 'error'

export type ClickedPhotosResult = {
  groups: PhotoSequenceGroup[]
  radiusMeters: number
  isLoading: boolean
  isFetching: boolean
  gsvStatus: GsvStatus
}

export const useClickedPhotos = (): ClickedPhotosResult => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { clicked, providers, map, photoTypes, date } = search

  const {
    photos: allPhotos,
    isLoading: bboxPhotosLoading,
    isFetching: bboxPhotosFetching,
  } = useAllProviderPhotos(providers, bbox, map.zoom, photoTypes, date)
  const radiusMeters = clickRadiusMeters(map.zoom)

  const gsvEnabled = providers.includes('google-streetview')
  const googleMapsApiKey = getGoogleMapsApiKey()

  const streetViewQuery = useGoogleStreetViewClickPhoto(clicked, gsvEnabled)

  let groups: PhotoSequenceGroup[] = []
  if (clicked) {
    const nearby = allPhotos.filter(
      (photo) => distanceToPhoto(photo, clicked.lng, clicked.lat) <= radiusMeters,
    )
    const gsvPhoto = streetViewQuery.data
    const photos =
      gsvPhoto && photoMatchesFilters(gsvPhoto, photoTypes, date) ? [...nearby, gsvPhoto] : nearby
    groups = groupClickedPhotos(photos, clicked.lng, clicked.lat)
  }

  const gsvPending =
    gsvEnabled && clicked != null && googleMapsApiKey != null && streetViewQuery.isPending

  let gsvStatus: GsvStatus = 'idle'
  if (gsvEnabled && clicked != null) {
    if (googleMapsApiKey == null) {
      gsvStatus = 'no-key'
    } else if (streetViewQuery.isPending) {
      gsvStatus = 'loading'
    } else if (streetViewQuery.isError) {
      gsvStatus = 'error'
    } else if (streetViewQuery.data) {
      gsvStatus = 'ok'
    } else if (streetViewQuery.isFetched) {
      gsvStatus = 'none'
    }
  }

  return {
    groups,
    radiusMeters,
    isLoading: bboxPhotosLoading || gsvPending,
    isFetching: bboxPhotosFetching || streetViewQuery.isFetching,
    gsvStatus,
  }
}
