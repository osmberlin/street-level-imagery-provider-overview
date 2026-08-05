import { getStreetImageryConfig } from '@/street-imagery/config'
import { fetchMvt, pointLngLat } from '@/street-imagery/providers/fetchMvt'
import type { Bbox, TileCoord } from '@/street-imagery/providers/model'
import {
  collectSettledTiles,
  fetchTileCached,
  getTileCacheKey,
} from '@/street-imagery/providers/tileCache'
import { tilesForBbox } from '@/street-imagery/providers/tileMath'

export { pointLngLat }

export const MAPILLARY_TILE_ZOOM = 14

export const mapillaryTileUrl = (path: string, tile: TileCoord) => {
  const token = getStreetImageryConfig().mapillaryToken
  return `https://tiles.mapillary.com/maps/vtp/${path}/2/${tile.z}/${tile.x}/${tile.y}?access_token=${token}`
}

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
