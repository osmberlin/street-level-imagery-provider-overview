import { VectorTile } from '@mapbox/vector-tile'
import type { Feature } from 'geojson'
import { PbfReader } from 'pbf'
import type { TileCoord } from '@/features/providers/model'

export type MvtLayers = Record<string, Feature[]>

// Tile coordinates must be passed explicitly: URL parsing is unreliable because
// providers embed other numeric path segments (e.g. Mapillary's `/2/` API version).
export const fetchMvt = async (
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
      const feature = layer.feature(i)
      features.push(feature.toGeoJSON(tile.x, tile.y, tile.z) as Feature)
    }
    layers[layerName] = features
  }

  return layers
}
