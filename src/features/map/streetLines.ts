import {
  angleDiffDeg,
  bearingDeg,
  distanceMeters,
  snapToLine,
  type LngLat,
} from '@osm-editor-kit/street-imagery'
import type { Geometry } from 'geojson'

/** Basemap vector source + layer (OpenFreeMap / OpenMapTiles schema). */
export const STREET_SOURCE_ID = 'openmaptiles'
export const STREET_SOURCE_LAYER = 'transportation'
export const STREET_LINE_LAYER_ID = 'street-lines'
export const STREET_HIT_LAYER_ID = 'street-lines-hit'

/** Roads, foot and bike ways; excludes rail, ferries, piers. */
export const STREET_CLASSES = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'minor',
  'service',
  'track',
  'path',
  'busway',
]

export const geometryLines = (geometry: Geometry): LngLat[][] => {
  if (geometry.type === 'LineString') {
    return [geometry.coordinates as LngLat[]]
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates as LngLat[][]
  }
  return []
}

const TOLERANCE_METERS = 3
const MAX_STEPS = 30

/**
 * The part of `fragment` that continues `line` beyond its last point, or null.
 * Vector tiles split long streets at tile borders (with overlap), so fragments touch or overlap
 * the line end rather than sharing an exact vertex.
 */
const continuation = (line: LngLat[], fragment: LngLat[]): LngLat[] | null => {
  const end = line[line.length - 1] as LngLat
  const previous = line[line.length - 2] as LngLat
  const snapped = snapToLine(fragment, end)
  if (!snapped || distanceMeters(snapped.point, end) > TOLERANCE_METERS) {
    return null
  }
  const outward = bearingDeg(previous, end)
  const ahead = fragment.slice(snapped.segmentIndex + 1)
  const behind = fragment.slice(0, snapped.segmentIndex + 1).reverse()
  for (const part of [ahead, behind]) {
    const next = part.find((point) => distanceMeters(point, end) > TOLERANCE_METERS)
    if (next && angleDiffDeg(bearingDeg(end, next), outward) < 60) {
      return part.slice(part.indexOf(next))
    }
  }
  return null
}

const extendForward = (line: LngLat[], fragments: LngLat[][]): LngLat[] => {
  let result = line
  const used = new Set<number>()
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const found = fragments.findIndex(
      (fragment, index) => !used.has(index) && continuation(result, fragment) != null,
    )
    if (found === -1) {
      break
    }
    used.add(found)
    result = [...result, ...(continuation(result, fragments[found] as LngLat[]) ?? [])]
  }
  return result
}

/** Grow the clicked fragment in both directions with touching fragments of the same street. */
export const joinStreetFragments = (clicked: LngLat[], fragments: LngLat[][]): LngLat[] => {
  if (clicked.length < 2) {
    return clicked
  }
  const forward = extendForward(clicked, fragments)
  return extendForward([...forward].reverse(), fragments).reverse()
}
