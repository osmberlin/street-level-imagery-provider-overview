import { fetchMvt, pointLngLat } from '@/features/providers/fetchMvt'
import type { Bbox, TileCoord } from '@/features/providers/model'
import {
  collectSettledTiles,
  fetchTileCached,
  getTileCacheKey,
} from '@/features/providers/tileCache'
import { tilesForBbox } from '@/features/providers/tileMath'

export { pointLngLat }

export const MAPILLARY_ACCESS_TOKEN = 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf'
export const MAPILLARY_TILE_ZOOM = 14

export const mapillaryTileUrl = (path: string, tile: TileCoord) =>
  `https://tiles.mapillary.com/maps/vtp/${path}/2/${tile.z}/${tile.x}/${tile.y}?access_token=${MAPILLARY_ACCESS_TOKEN}`

export const fetchMapillaryMvtTiles = async (
  cachePrefix: string,
  path: string,
  bbox: Bbox,
  signal: AbortSignal,
) => {
  const tiles = tilesForBbox(bbox, MAPILLARY_TILE_ZOOM, { skipNullIsland: true })
  return collectSettledTiles(
    tiles.map((tile) => {
      const key = getTileCacheKey(cachePrefix, tile)
      return fetchTileCached(
        key,
        (innerSignal) => fetchMvt(mapillaryTileUrl(path, tile), tile, innerSignal),
        signal,
      )
    }),
  )
}
