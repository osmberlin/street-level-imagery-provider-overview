import type { TileCoord } from '@/features/providers/model'

const MAPILIO_GEO_PROXY_PREFIX = 'mapilio-geo'

/** Same-origin path proxied to geo.mapilio.com (Vite dev server + service worker in production). */
export const mapilioGeoUrl = (pathAndQuery: string): string => {
  const base = import.meta.env.BASE_URL
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`
  return `${base}${MAPILIO_GEO_PROXY_PREFIX}${path}`
}

export const mapilioWmtsTileUrl = (layer: string, tile: TileCoord): string => {
  const params = new URLSearchParams({
    REQUEST: 'GetTile',
    SERVICE: 'WMTS',
    VERSION: '1.0.0',
    LAYER: layer,
    STYLE: '',
    TILEMATRIX: `EPSG:900913:${tile.z}`,
    TILEMATRIXSET: 'EPSG:900913',
    FORMAT: 'application/vnd.mapbox-vector-tile',
    TILECOL: String(tile.x),
    TILEROW: String(tile.y),
  })
  return mapilioGeoUrl(`/geoserver/gwc/service/wmts?${params}`)
}
