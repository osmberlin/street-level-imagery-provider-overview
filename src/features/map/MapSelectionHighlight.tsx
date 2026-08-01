import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { isProviderId } from '@/app/searchSchema'
import {
  emptyLineCollection,
  emptyPointCollection,
  photosToFeatureCollection,
  sequencesToFeatureCollection,
} from '@/features/data/geojson'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { useProviderSequences } from '@/features/data/useProviderData'
import { photoGroupSequenceId } from '@/features/viewer/groupClickedPhotos'
import { useGoogleStreetViewClickPhoto } from '@/features/viewer/useGoogleStreetViewClickPhoto'

const HIGHLIGHT_SOURCE_ID = 'selection-highlight'
const HIGHLIGHT_LAYER_ID = 'selection-highlight-layer'
const SEQUENCE_HIGHLIGHT_SOURCE_ID = 'sequence-highlight'
const SEQUENCE_HIGHLIGHT_LAYER_ID = 'sequence-highlight-layer'

export const MapSelectionHighlight = () => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { clicked, selected, providers, map, photoTypes, date } = search

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.z, photoTypes, date)
  const gsvEnabled = providers.includes('google-streetview')
  const streetViewQuery = useGoogleStreetViewClickPhoto(clicked, gsvEnabled)

  const selectedPhoto = useMemo(() => {
    if (!selected) {
      return null
    }
    const fromAllPhotos = allPhotos.find(
      (photo) =>
        photo.providerId === selected.provider &&
        photo.photoId === selected.photoId &&
        photoGroupSequenceId(photo) === (selected.sequenceId ?? `photo:${selected.photoId}`),
    )
    if (fromAllPhotos) {
      return fromAllPhotos
    }

    const gsvPhoto = streetViewQuery.data
    if (
      selected.provider === 'google-streetview' &&
      gsvPhoto &&
      gsvPhoto.photoId === selected.photoId &&
      photoGroupSequenceId(gsvPhoto) === (selected.sequenceId ?? `photo:${selected.photoId}`)
    ) {
      return gsvPhoto
    }

    return null
  }, [allPhotos, selected, streetViewQuery.data])

  const selectedProviderId = selected && isProviderId(selected.provider) ? selected.provider : null

  const { data: sequences = [] } = useProviderSequences(
    selectedProviderId ?? 'mapillary',
    selectedProviderId ? bbox : null,
    map.z,
  )

  const highlightCollection = useMemo(() => {
    if (!selectedPhoto) {
      return emptyPointCollection()
    }
    return photosToFeatureCollection([selectedPhoto])
  }, [selectedPhoto])

  const sequenceHighlightCollection = useMemo(() => {
    if (!selected || !selectedProviderId) {
      return emptyLineCollection()
    }

    const matching = sequences.filter(
      (sequence) =>
        sequence.providerId === selectedProviderId && sequence.sequenceId === selected.sequenceId,
    )

    return sequencesToFeatureCollection(matching)
  }, [selected, selectedProviderId, sequences])

  if (!selectedPhoto && sequenceHighlightCollection.features.length === 0) {
    return null
  }

  return (
    <>
      {selectedPhoto ? (
        <Source id={HIGHLIGHT_SOURCE_ID} type="geojson" data={highlightCollection}>
          <Layer
            id={HIGHLIGHT_LAYER_ID}
            type="circle"
            paint={{
              'circle-radius': 10,
              'circle-color': '#ffffff',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#0f172a',
            }}
          />
        </Source>
      ) : null}

      {sequenceHighlightCollection.features.length > 0 ? (
        <Source id={SEQUENCE_HIGHLIGHT_SOURCE_ID} type="geojson" data={sequenceHighlightCollection}>
          <Layer
            id={SEQUENCE_HIGHLIGHT_LAYER_ID}
            type="line"
            paint={{
              'line-color': '#0f172a',
              'line-width': 4,
              'line-opacity': 0.75,
            }}
          />
        </Source>
      ) : null}
    </>
  )
}
