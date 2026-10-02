import type { LngLat } from '@osm-editor-kit/street-imagery'
import type { FeatureCollection, LineString } from 'geojson'
import type { FilterSpecification } from 'maplibre-gl'
import { Layer, Source } from 'react-map-gl/maplibre'
import {
  STREET_CLASSES,
  STREET_HIT_LAYER_ID,
  STREET_LINE_LAYER_ID,
  STREET_SOURCE_ID,
  STREET_SOURCE_LAYER,
} from '@/features/map/streetLines'

/** Same family as the view cones (`VIEWPOINT_DEFAULT_COLOR`): streets are where views start. */
const STREET_COLOR = '#a21caf'
const MIN_ZOOM = 14

const streetFilter: FilterSpecification = [
  'all',
  ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
  ['match', ['get', 'class'], STREET_CLASSES, true, false],
]

type StreetLinesLayerProps = {
  /** Street under the pointer, drawn thicker. */
  hovered: LngLat[] | null
}

/**
 * Clickable roads, foot and bike ways on top of the basemap. Reuses the basemap's own vector
 * source; `STREET_HIT_LAYER_ID` is a wide, almost invisible line for easy clicking.
 */
export const StreetLinesLayer = ({ hovered }: StreetLinesLayerProps) => {
  const hoveredData: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: hovered
      ? [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: hovered },
          },
        ]
      : [],
  }

  return (
    <>
      <Layer
        filter={streetFilter}
        id={STREET_LINE_LAYER_ID}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        minzoom={MIN_ZOOM}
        paint={{
          'line-color': STREET_COLOR,
          'line-opacity': 0.45,
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.75, 18, 1.5],
        }}
        source={STREET_SOURCE_ID}
        source-layer={STREET_SOURCE_LAYER}
        type="line"
      />
      <Layer
        filter={streetFilter}
        id={STREET_HIT_LAYER_ID}
        minzoom={MIN_ZOOM}
        paint={{ 'line-color': STREET_COLOR, 'line-opacity': 0.01, 'line-width': 14 }}
        source={STREET_SOURCE_ID}
        source-layer={STREET_SOURCE_LAYER}
        type="line"
      />
      <Source data={hoveredData} id="street-hover" type="geojson" />
      <Layer
        id="street-hover-line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': STREET_COLOR, 'line-opacity': 0.8, 'line-width': 3.5 }}
        source="street-hover"
        type="line"
      />
    </>
  )
}
