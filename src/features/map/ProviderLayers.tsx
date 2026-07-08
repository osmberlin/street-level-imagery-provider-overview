import type { ExpressionSpecification } from 'maplibre-gl'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { AppSearch } from '@/app/searchSchema'
import {
  emptyLineCollection,
  emptyPointCollection,
  mapFeaturesToFeatureCollection,
  photosToFeatureCollection,
  sequencesToFeatureCollection,
} from '@/features/data/geojson'
import {
  useProviderMapFeatures,
  useProviderPhotos,
  useProviderSequences,
} from '@/features/data/useProviderData'
import { buildMapFeatureLayerFilter, buildPhotoLayerFilter } from '@/features/filters/searchFilters'
import type { Bbox } from '@/features/providers/model'
import {
  adapterById,
  featureLayerId,
  featureSourceId,
  photoLayerId,
  photoSourceId,
  sequenceLayerId,
  sequenceSourceId,
  type ProviderId,
} from '@/features/providers/registry'
import {
  getMapFeatureStyleDefinition,
  getStyleDefinition,
} from '@/features/styles/styleDefinitions'

type ProviderLayerProps = {
  providerId: ProviderId
  bbox: Bbox | null
  zoom: number
  style: AppSearch['style']
  photoTypes?: AppSearch['photoTypes']
  date?: AppSearch['date']
}

const CIRCLE_RADIUS: ['interpolate', ['linear'], ['zoom'], ...number[]] = [
  'interpolate',
  ['linear'],
  ['zoom'],
  10,
  2,
  14,
  4,
  18,
  6,
]

const FEATURE_CIRCLE_RADIUS: ['interpolate', ['linear'], ['zoom'], ...number[]] = [
  'interpolate',
  ['linear'],
  ['zoom'],
  10,
  1.5,
  14,
  3,
  18,
  4,
]

// Render newer points above older ones; unknown dates sink to the bottom.
// circle-sort-key sorts ascending, so the epoch-ms timestamp works directly.
const PHOTO_SORT_KEY: ExpressionSpecification = ['coalesce', ['get', 'capturedAt'], 0]
const FEATURE_SORT_KEY: ExpressionSpecification = ['coalesce', ['get', 'lastSeenAt'], 0]

const PhotoProviderLayer = ({
  providerId,
  bbox,
  zoom,
  style,
  photoTypes,
  date,
}: ProviderLayerProps) => {
  const adapter = adapterById[providerId]
  const styleDefinition = getStyleDefinition(style)
  const { data: photos = [] } = useProviderPhotos(providerId, bbox, zoom)
  const { data: sequences = [] } = useProviderSequences(providerId, bbox, zoom)

  const photoCollection =
    zoom >= adapter.minZoom ? photosToFeatureCollection(photos) : emptyPointCollection()
  const sequenceCollection =
    zoom >= (adapter.sequencesMinZoom ?? adapter.minZoom)
      ? sequencesToFeatureCollection(sequences)
      : emptyLineCollection()

  const photoFilter = buildPhotoLayerFilter(photoTypes, date)

  return (
    <>
      <Source
        id={photoSourceId(providerId)}
        type="geojson"
        data={photoCollection}
        promoteId="photoId"
      >
        <Layer
          id={photoLayerId(providerId)}
          type="circle"
          filter={photoFilter}
          layout={{ 'circle-sort-key': PHOTO_SORT_KEY }}
          paint={{
            'circle-radius': CIRCLE_RADIUS,
            'circle-color': styleDefinition.circleColorExpression,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          }}
        />
      </Source>

      {adapter.fetchSequences ? (
        <Source id={sequenceSourceId(providerId)} type="geojson" data={sequenceCollection}>
          <Layer
            id={sequenceLayerId(providerId)}
            type="line"
            paint={{
              'line-color': adapter.color,
              'line-width': 2,
              'line-opacity': 0.35,
            }}
          />
        </Source>
      ) : null}
    </>
  )
}

const MapFeatureProviderLayer = ({ providerId, bbox, zoom, style, date }: ProviderLayerProps) => {
  const adapter = adapterById[providerId]
  const styleDefinition = getMapFeatureStyleDefinition(style)
  const { data: features = [] } = useProviderMapFeatures(providerId, bbox, zoom)

  const featureCollection =
    zoom >= adapter.minZoom ? mapFeaturesToFeatureCollection(features) : emptyPointCollection()

  const featureFilter = buildMapFeatureLayerFilter(date)

  return (
    <Source
      id={featureSourceId(providerId)}
      type="geojson"
      data={featureCollection}
      promoteId="featureId"
    >
      <Layer
        id={featureLayerId(providerId)}
        type="circle"
        filter={featureFilter}
        layout={{ 'circle-sort-key': FEATURE_SORT_KEY }}
        paint={{
          'circle-radius': FEATURE_CIRCLE_RADIUS,
          'circle-color': styleDefinition.circleColorExpression,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  )
}

const ProviderLayer = (props: ProviderLayerProps) => {
  const adapter = adapterById[props.providerId]
  return adapter.kind === 'mapFeature' ? (
    <MapFeatureProviderLayer {...props} />
  ) : (
    <PhotoProviderLayer {...props} />
  )
}

type ProviderLayersProps = {
  providerIds: ProviderId[]
  bbox: Bbox | null
  zoom: number
  style: AppSearch['style']
  photoTypes?: AppSearch['photoTypes']
  date?: AppSearch['date']
}

export const ProviderLayers = ({
  providerIds,
  bbox,
  zoom,
  style,
  photoTypes,
  date,
}: ProviderLayersProps) => (
  <>
    {providerIds.map((providerId) => (
      <ProviderLayer
        key={providerId}
        bbox={bbox}
        date={date}
        photoTypes={photoTypes}
        providerId={providerId}
        style={style}
        zoom={zoom}
      />
    ))}
  </>
)
