import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useStreetViewClickPhoto } from '@/features/viewer/useStreetViewClickPhoto'
import { useAllProviderPhotos } from '@/street-imagery-react/hooks/useAllProviderPhotos'
import { useMapViewportBbox } from '@/street-imagery-react/hooks/useMapViewportBbox'
import { photoMatchesFilters } from '@/street-imagery/filters/searchFilters'
import { getGoogleMapsApiKey } from '@/street-imagery/providers/adapters/streetview'
import { clickRadiusMeters } from '@/street-imagery/viewer/clickRadius'
import {
  distanceToPhoto,
  groupClickedPhotos,
  type PhotoSequenceGroup,
} from '@/street-imagery/viewer/groupClickedPhotos'

export type GsvStatus = 'idle' | 'loading' | 'ok' | 'none' | 'no-key' | 'error'

export type ClickedPhotosResult = {
  groups: PhotoSequenceGroup[]
  radiusMeters: number
  isLoading: boolean
  isFetching: boolean
  gsvStatus: GsvStatus
}

export const useClickedPhotos = (): ClickedPhotosResult => {
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const { clicked, providers, photoTypes, date } = search

  const {
    photos: allPhotos,
    isLoading: bboxPhotosLoading,
    isFetching: bboxPhotosFetching,
  } = useAllProviderPhotos(providers, bbox, map.zoom, photoTypes, date)
  const radiusMeters = clickRadiusMeters(map.zoom)

  const streetViewEnabled = providers.includes('streetview')
  const googleMapsApiKey = getGoogleMapsApiKey()

  const streetViewQuery = useStreetViewClickPhoto(clicked, streetViewEnabled)

  let groups: PhotoSequenceGroup[] = []
  if (clicked) {
    const nearby = allPhotos.filter(
      (photo) => distanceToPhoto(photo, clicked.lng, clicked.lat) <= radiusMeters,
    )
    const streetViewPhoto = streetViewQuery.data
    const photos =
      streetViewPhoto && photoMatchesFilters(streetViewPhoto, photoTypes, date)
        ? [...nearby, streetViewPhoto]
        : nearby
    groups = groupClickedPhotos(photos, clicked.lng, clicked.lat)
  }

  const streetViewPending =
    streetViewEnabled && clicked != null && googleMapsApiKey != null && streetViewQuery.isPending

  let gsvStatus: GsvStatus = 'idle'
  if (streetViewEnabled && clicked != null) {
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
    isLoading: bboxPhotosLoading || streetViewPending,
    isFetching: bboxPhotosFetching || streetViewQuery.isFetching,
    gsvStatus,
  }
}
