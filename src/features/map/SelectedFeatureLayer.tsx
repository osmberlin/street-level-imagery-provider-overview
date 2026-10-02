import type { FeatureCollection, LineString, Point } from 'geojson'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useSelectedFeature } from '@/features/viewer/useSelectedFeature'

const COLOR = '#f59e0b'

/**
 * The selected sign or object on the map: a ring around it and a dotted line to it from the shown
 * photo. Mapillary has two positions per photo: the camera's GPS position, where the photo dot is
 * drawn, and a computed one, which the feature was located from (and where the view cone sits).
 * As in iD, the line runs photo dot → computed position (small dot) → feature, so both connect.
 */
export const SelectedFeatureLayer = () => {
  const { data, shownImage } = useSelectedFeature()

  const computed = shownImage?.lngLat
  const original = shownImage?.originalLngLat
  const points: FeatureCollection<Point, { kind: 'feature' | 'computed' }> = {
    type: 'FeatureCollection',
    features: [
      ...(data
        ? [
            {
              type: 'Feature' as const,
              properties: { kind: 'feature' as const },
              geometry: { type: 'Point' as const, coordinates: data.feature.lngLat },
            },
          ]
        : []),
      ...(data && computed
        ? [
            {
              type: 'Feature' as const,
              properties: { kind: 'computed' as const },
              geometry: { type: 'Point' as const, coordinates: computed },
            },
          ]
        : []),
    ],
  }
  const line: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features:
      data && computed
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [...(original ? [original] : []), computed, data.feature.lngLat],
              },
            },
          ]
        : [],
  }

  return (
    <>
      <Source data={line} id="selected-feature-line" type="geojson" />
      <Layer
        id="selected-feature-line"
        paint={{ 'line-color': COLOR, 'line-width': 2, 'line-dasharray': [1, 1.5] }}
        source="selected-feature-line"
        type="line"
      />
      <Source data={points} id="selected-feature-point" type="geojson" />
      <Layer
        filter={['==', ['get', 'kind'], 'feature']}
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
      <Layer
        filter={['==', ['get', 'kind'], 'computed']}
        id="selected-feature-computed-position"
        paint={{
          'circle-radius': 3.5,
          'circle-color': COLOR,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        }}
        source="selected-feature-point"
        type="circle"
      />
    </>
  )
}
