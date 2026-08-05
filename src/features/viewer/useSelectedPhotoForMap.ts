import { useAppSearchNavigation } from '@/app/searchNavigation'
import { isProviderId } from '@/app/searchSchema'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useStreetViewClickPhoto } from '@/features/viewer/useStreetViewClickPhoto'
import { useAllProviderPhotos } from '@/street-imagery-react/hooks/useAllProviderPhotos'
import { useMapViewportBbox } from '@/street-imagery-react/hooks/useMapViewportBbox'
import {
  useViewerBearing,
  useViewerHfov,
  useViewerLngLat,
} from '@/street-imagery-react/useViewerStore'
import type { NormalizedPhoto } from '@/street-imagery/providers/model'
import { photoGroupSequenceId } from '@/street-imagery/viewer/groupClickedPhotos'

export const useSelectedPhotoForMap = (): {
  selectedPhoto: NormalizedPhoto | null
  selectedSequenceId: string | null
  viewerPov: {
    bearing: number | null
    hfov: number | null
    lngLat: [number, number] | null
  }
} => {
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const { selected, providers, photoTypes, date } = search

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.zoom, photoTypes, date)
  const streetViewEnabled = providers.includes('streetview')
  const streetViewQuery = useStreetViewClickPhoto(search.clicked, streetViewEnabled)

  let selectedPhoto: NormalizedPhoto | null = null
  if (selected) {
    const fromAllPhotos = allPhotos.find(
      (photo) =>
        photo.providerId === selected.provider &&
        photo.photoId === selected.photoId &&
        photoGroupSequenceId(photo) === (selected.sequenceId ?? `photo:${selected.photoId}`),
    )
    if (fromAllPhotos) {
      selectedPhoto = fromAllPhotos
    } else {
      const streetViewPhoto = streetViewQuery.data
      if (
        selected.provider === 'streetview' &&
        streetViewPhoto &&
        streetViewPhoto.photoId === selected.photoId &&
        photoGroupSequenceId(streetViewPhoto) ===
          (selected.sequenceId ?? `photo:${selected.photoId}`)
      ) {
        selectedPhoto = streetViewPhoto
      }
    }
  }

  const selectedSequenceId =
    selected && isProviderId(selected.provider) ? (selected.sequenceId ?? null) : null

  const bearing = useViewerBearing()
  const hfov = useViewerHfov()
  const lngLat = useViewerLngLat()

  return {
    selectedPhoto,
    selectedSequenceId,
    viewerPov: { bearing, hfov, lngLat },
  }
}
