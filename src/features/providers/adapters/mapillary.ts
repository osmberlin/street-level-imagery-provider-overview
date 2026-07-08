import type { Feature, Point } from 'geojson'
import { fetchMvt } from '@/features/providers/fetchMvt'
import type {
  Bbox,
  NormalizedPhoto,
  NormalizedSequence,
  ProviderAdapter,
  TileCoord,
} from '@/features/providers/model'
import { fetchTileCached, getTileCacheKey } from '@/features/providers/tileCache'
import { tilesForBbox } from '@/features/providers/tileMath'

const ACCESS_TOKEN = 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf'
const TILE_ZOOM = 14

const tileUrl = (tile: TileCoord) =>
  `https://tiles.mapillary.com/maps/vtp/mly1_public/2/${tile.z}/${tile.x}/${tile.y}?access_token=${ACCESS_TOKEN}`

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

export const normalizeMapillaryImageFeature = (
  feature: Feature,
): Omit<NormalizedPhoto, 'providerId'> | null => {
  const lngLat = pointLngLat(feature)
  if (!lngLat) {
    return null
  }

  const props = feature.properties ?? {}
  const id = props.id
  if (id === undefined || id === null) {
    return null
  }

  return {
    photoId: String(id),
    sequenceId: props.sequence_id != null ? String(props.sequence_id) : null,
    capturedAt: typeof props.captured_at === 'number' ? props.captured_at : null,
    isPano: typeof props.is_pano === 'boolean' ? props.is_pano : null,
    heading: typeof props.compass_angle === 'number' ? props.compass_angle : null,
    lngLat,
  }
}

export const normalizeMapillarySequenceFeature = (
  feature: Feature,
): Omit<NormalizedSequence, 'providerId'> | null => {
  const props = feature.properties ?? {}
  const id = props.id
  if (id == null) {
    return null
  }

  const { geometry } = feature
  if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') {
    return null
  }

  return {
    sequenceId: String(id),
    geometry,
  }
}

const fetchMapillaryTile = async (tile: TileCoord, _signal: AbortSignal) => {
  const key = getTileCacheKey('mapillary', tile)
  return fetchTileCached(key, (innerSignal) => fetchMvt(tileUrl(tile), tile, innerSignal))
}

const fetchMapillaryTiles = async (bbox: Bbox, signal: AbortSignal) => {
  const tiles = tilesForBbox(bbox, TILE_ZOOM, { skipNullIsland: true })
  return Promise.all(tiles.map((tile) => fetchMapillaryTile(tile, signal)))
}

const fetchPhotos = async (bbox: Bbox, _zoom: number, signal: AbortSignal) => {
  const tileLayers = await fetchMapillaryTiles(bbox, signal)
  const photos: NormalizedPhoto[] = []

  for (const layers of tileLayers) {
    const imageFeatures = layers.image ?? []
    for (const feature of imageFeatures) {
      const normalized = normalizeMapillaryImageFeature(feature)
      if (normalized) {
        photos.push({ providerId: 'mapillary', ...normalized })
      }
    }
  }

  return photos
}

const fetchSequences = async (bbox: Bbox, _zoom: number, signal: AbortSignal) => {
  const tileLayers = await fetchMapillaryTiles(bbox, signal)
  const sequences: NormalizedSequence[] = []

  for (const layers of tileLayers) {
    const sequenceFeatures = layers.sequence ?? []
    for (const feature of sequenceFeatures) {
      const normalized = normalizeMapillarySequenceFeature(feature)
      if (normalized) {
        sequences.push({ providerId: 'mapillary', ...normalized })
      }
    }
  }

  return sequences
}

export const mapillaryAdapter: ProviderAdapter = {
  id: 'mapillary',
  kind: 'photo',
  label: 'Mapillary',
  color: '#05CB63',
  minZoom: 12,
  fetchPhotos,
  fetchSequences,
}
