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

const HIGHLIGHT_SOURCE_ID = 'selection-highlight'
const HIGHLIGHT_LAYER_ID = 'selection-highlight-layer'
const SEQUENCE_HIGHLIGHT_SOURCE_ID = 'sequence-highlight'
const SEQUENCE_HIGHLIGHT_LAYER_ID = 'sequence-highlight-layer'

export const MapSelectionHighlight = () => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { selected, providers, map, photoTypes, date } = search

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.z, photoTypes, date)

  const selectedPhoto = useMemo(() => {
    if (!selected) {
      return null
    }
    return (
      allPhotos.find(
        (photo) =>
          photo.providerId === selected.provider &&
          photo.photoId === selected.photoId &&
          (photo.sequenceId ?? `photo:${photo.photoId}`) === selected.sequenceId,
      ) ?? null
    )
  }, [allPhotos, selected])

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
