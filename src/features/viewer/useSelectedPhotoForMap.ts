import type { NormalizedPhoto } from '@osm-editor-kit/street-imagery'
import { photoGroupSequenceId } from '@osm-editor-kit/street-imagery'
import { useAllProviderPhotos } from '@osm-editor-kit/street-imagery-react'
import { useMapViewportBbox } from '@osm-editor-kit/street-imagery-react'
import {
  useCurrentHistoryEntry,
  useViewerBearing,
  useViewerHfov,
  useViewerLngLat,
} from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { isProviderId } from '@/app/searchSchema'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { useStreetViewClickPhoto } from '@/features/viewer/useStreetViewClickPhoto'

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
  const bbox = useMapViewportBbox(MAIN_MAP_ID)
  const { selected, providers, photoTypes, date } = search

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.zoom, photoTypes, date)
  const streetViewEnabled = providers.includes('streetview')
  const streetViewQuery = useStreetViewClickPhoto(search.clicked, streetViewEnabled)
  const historyPhoto = useCurrentHistoryEntry()?.photo ?? null

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
    } else if (
      historyPhoto?.providerId === selected.provider &&
      historyPhoto.photoId === selected.photoId
    ) {
      // Photos from the viewpoint radius search may not be among the loaded map tiles.
      selectedPhoto = historyPhoto
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
