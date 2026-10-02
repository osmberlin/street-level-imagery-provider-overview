import {
  SELECTION_COLOR,
  useAllProviderMapFeatures,
  useMapViewportBbox,
  VIEW_SHAPE_FILL_OPACITY,
} from '@osm-editor-kit/street-imagery-react'
import type { FeatureCollection, LineString, Point } from 'geojson'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { MAP_FEATURE_COLORS } from '@/features/styles/styleDefinitions'
import { useSelectedFeature } from '@/features/viewer/useSelectedFeature'

/** The map features' purple; the selected one is drawn larger, on a light disk. */
const FEATURE_COLOR = MAP_FEATURE_COLORS.feature

/**
 * The selected sign or object on the map: its dot on a light disk, and a dotted line to it from the
 * camera position of the shown photo (Mapillary's computed position, which the feature was located
 * from). The photo's own marker, camera pin and their connector come from the package's selection
 * overlay, so the chain reads photo dot → camera pin → feature, as in iD.
 */
export const SelectedFeatureLayer = () => {
  const { data, shownImage } = useSelectedFeature()
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const drawnFeatures = useAllProviderMapFeatures(search.providers, bbox, map.zoom)

  // The dot on the map comes from the vector tiles, whose position can differ a little from the
  // Graph API's. Ring the dot that is drawn; fall back to the API position when it is not loaded.
  const target = data
    ? (drawnFeatures.find((feature) => feature.featureId === data.feature.id)?.lngLat ??
      data.feature.lngLat)
    : null

  const camera = shownImage?.lngLat
  const points: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: target
      ? [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: target },
          },
        ]
      : [],
  }
  const line: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features:
      target && camera
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [camera, target] },
            },
          ]
        : [],
  }

  return (
    <>
      <Source data={line} id="selected-feature-line" type="geojson" />
      <Layer
        id="selected-feature-line"
        paint={{ 'line-color': SELECTION_COLOR, 'line-width': 1.5, 'line-dasharray': [2, 1.5] }}
        source="selected-feature-line"
        type="line"
      />
      <Source data={points} id="selected-feature-point" type="geojson" />
      {/* A light disk without an edge, like the 360° disks of photos. */}
      <Layer
        id="selected-feature-disk"
        paint={{
          'circle-radius': 17,
          'circle-color': FEATURE_COLOR,
          'circle-opacity': VIEW_SHAPE_FILL_OPACITY,
        }}
        source="selected-feature-point"
        type="circle"
      />
      {/* The feature's dot, 20 % larger than the other features' dots. */}
      <Layer
        id="selected-feature-dot"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 14, 3.6, 18, 4.8],
          'circle-color': FEATURE_COLOR,
        }}
        source="selected-feature-point"
        type="circle"
      />
    </>
  )
}
