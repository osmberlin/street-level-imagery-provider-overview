import { VectorTile } from '@mapbox/vector-tile'
import type { Feature, LineString, MultiLineString, Point } from 'geojson'
import { PbfReader } from 'pbf'
import type { MvtLayers } from '@/features/providers/fetchMvt'
import type {
  Bbox,
  NormalizedPhoto,
  NormalizedSequence,
  ProviderAdapter,
  TileCoord,
} from '@/features/providers/model'
import { fetchTileCached, getTileCacheKey } from '@/features/providers/tileCache'
import { tilesForBbox } from '@/features/providers/tileMath'

const TILE_ZOOM = 14
const POINTS_LAYER = 'mapilio:map_points'
const ROADS_LAYER = 'mapilio:map_roads_line'

const wmtsUrl = (layer: string, tile: TileCoord) =>
  `https://geo.mapilio.com/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=${layer}&STYLE=&TILEMATRIX=EPSG:900913:${tile.z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL=${tile.x}&TILEROW=${tile.y}`

const pointLngLat = (feature: Feature): [number, number] | null => {
  if (feature.geometry.type !== 'Point') {
    return null
  }
  const [lng, lat] = (feature.geometry as Point).coordinates
  if (lng === undefined || lat === undefined) {
    return null
  }
  return [lng, lat]
}

export const parseMapilioCaptureTime = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

export const parseMapilioResolution = (resolution: unknown): boolean | null => {
  if (typeof resolution !== 'string') {
    return null
  }
  const match = resolution.match(/^(\d+)x(\d+)$/i)
  if (!match) {
    return null
  }
  const width = Number(match[1])
  const height = Number(match[2])
  if (!width || !height) {
    return null
  }
  const max = Math.max(width, height)
  const min = Math.min(width, height)
  return max % min === 0
}

export const normalizeMapilioPointFeature = (
  feature: Feature,
): Omit<NormalizedPhoto, 'providerId'> | null => {
  const lngLat = pointLngLat(feature)
  if (!lngLat) {
    return null
  }

  const props = feature.properties ?? {}
  const id = props.id
  if (id == null) {
    return null
  }

  const heading =
    props.heading == null
      ? null
      : typeof props.heading === 'number'
        ? props.heading
        : Number.parseFloat(String(props.heading))

  return {
    photoId: String(id),
    sequenceId: props.sequence_uuid != null ? String(props.sequence_uuid) : null,
    capturedAt: parseMapilioCaptureTime(props.capture_time),
    isPano: parseMapilioResolution(props.resolution),
    heading: heading != null && !Number.isNaN(heading) ? heading : null,
    lngLat,
  }
}

const geometryKey = (geometry: LineString | MultiLineString): string =>
  JSON.stringify(geometry.coordinates)

export const normalizeMapilioRoadFeature = (
  feature: Feature,
): Omit<NormalizedSequence, 'providerId'> | null => {
  const props = feature.properties ?? {}
  const sequenceId = props.sequence_uuid
  if (sequenceId == null) {
    return null
  }

  const { geometry } = feature
  if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') {
    return null
  }

  return {
    sequenceId: String(sequenceId),
    geometry,
  }
}

const fetchWmtsMvt = async (
  url: string,
  tile: TileCoord,
  signal: AbortSignal,
): Promise<MvtLayers> => {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`MVT fetch failed (${response.status}): ${url}`)
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) {
    return {}
  }

  const vectorTile = new VectorTile(new PbfReader(buffer))
  const layers: MvtLayers = {}

  for (const layerName of Object.keys(vectorTile.layers)) {
    const layer = vectorTile.layers[layerName]
    if (!layer) {
      continue
    }

    const features: Feature[] = []
    for (let i = 0; i < layer.length; i += 1) {
      const mvtFeature = layer.feature(i)
      features.push(mvtFeature.toGeoJSON(tile.x, tile.y, tile.z) as Feature)
    }
    layers[layerName] = features
  }

  return layers
}

const fetchMapilioTile = async (layer: string, tile: TileCoord, _signal: AbortSignal) => {
  const cacheLayer = layer === POINTS_LAYER ? 'points' : 'roads'
  const key = getTileCacheKey(`mapilio:${cacheLayer}`, tile)
  return fetchTileCached(key, (innerSignal) =>
    fetchWmtsMvt(wmtsUrl(layer, tile), tile, innerSignal),
  )
}

const fetchMapilioPointTiles = async (bbox: Bbox, signal: AbortSignal) => {
  const tiles = tilesForBbox(bbox, TILE_ZOOM, { skipNullIsland: true })
  return Promise.all(tiles.map((tile) => fetchMapilioTile(POINTS_LAYER, tile, signal)))
}

const fetchPhotos = async (bbox: Bbox, _zoom: number, signal: AbortSignal) => {
  const tileLayers = await fetchMapilioPointTiles(bbox, signal)
  const photos: NormalizedPhoto[] = []

  for (const layers of tileLayers) {
    const pointFeatures = layers.map_points ?? []
    for (const feature of pointFeatures) {
      const normalized = normalizeMapilioPointFeature(feature)
      if (normalized) {
        photos.push({ providerId: 'mapilio', ...normalized })
      }
    }
  }

  return photos
}

const fetchSequences = async (bbox: Bbox, _zoom: number, signal: AbortSignal) => {
  const tiles = tilesForBbox(bbox, TILE_ZOOM, { skipNullIsland: true })
  const tileLayers = await Promise.all(
    tiles.map((tile) => fetchMapilioTile(ROADS_LAYER, tile, signal)),
  )

  const sequences: NormalizedSequence[] = []
  const seenGeometries = new Map<string, Set<string>>()

  for (const layers of tileLayers) {
    const roadFeatures = layers.map_roads_line ?? []
    for (const feature of roadFeatures) {
      const normalized = normalizeMapilioRoadFeature(feature)
      if (!normalized) {
        continue
      }

      const key = geometryKey(normalized.geometry)
      const seenForSequence = seenGeometries.get(normalized.sequenceId) ?? new Set<string>()
      if (seenForSequence.has(key)) {
        continue
      }
      seenForSequence.add(key)
      seenGeometries.set(normalized.sequenceId, seenForSequence)
      sequences.push({ providerId: 'mapilio', ...normalized })
    }
  }

  return sequences
}

export const mapilioAdapter: ProviderAdapter = {
  id: 'mapilio',
  kind: 'photo',
  label: 'Mapilio',
  color: '#0D9488',
  minZoom: 14,
  fetchPhotos,
  fetchSequences,
}
