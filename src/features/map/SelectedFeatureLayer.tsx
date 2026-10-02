import type { FeatureCollection, LineString, Point } from 'geojson'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useSelectedFeature } from '@/features/viewer/useSelectedFeature'

const COLOR = '#f59e0b'

/**
 * The selected sign or object on the map: a ring around it and a dotted line to it from the
 * camera position of the shown photo (Mapillary's computed position, which the feature was located
 * from). The photo's own marker, camera pin and their connector come from the package's selection
 * overlay, so the chain reads photo dot → camera pin → feature, as in iD.
 */
export const SelectedFeatureLayer = () => {
  const { data, shownImage } = useSelectedFeature()

  const camera = shownImage?.lngLat
  const points: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: data
      ? [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: data.feature.lngLat },
          },
        ]
      : [],
  }
  const line: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features:
      data && camera
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [camera, data.feature.lngLat] },
            },
          ]
        : [],
  }

  return (
    <>
      <Source data={line} id="selected-feature-line" type="geojson" />
      <Layer
        id="selected-feature-line"
        paint={{ 'line-color': COLOR, 'line-width': 1.5, 'line-dasharray': [2, 1.5] }}
        source="selected-feature-line"
        type="line"
      />
      <Source data={points} id="selected-feature-point" type="geojson" />
      <Layer
        id="selected-feature-ring"
        paint={{
          'circle-radius': 11,
          'circle-color': COLOR,
          'circle-opacity': 0.15,
          'circle-stroke-color': COLOR,
          'circle-stroke-width': 2.5,
        }}
        source="selected-feature-point"
        type="circle"
      />
    </>
  )
}
