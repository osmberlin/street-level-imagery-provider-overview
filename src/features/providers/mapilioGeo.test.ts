import { describe, expect, it, vi } from 'vitest'
import { mapilioGeoUrl, mapilioWmtsTileUrl } from '@/features/providers/mapilioGeo'

describe('mapilioGeoUrl', () => {
  it('builds a same-origin proxy path under BASE_URL', () => {
    vi.stubEnv('BASE_URL', '/street-level-imagery-provider-overview/')
    expect(mapilioGeoUrl('/geoserver/gwc/service/wmts?test=1')).toBe(
      '/street-level-imagery-provider-overview/mapilio-geo/geoserver/gwc/service/wmts?test=1',
    )
  })
})

describe('mapilioWmtsTileUrl', () => {
  it('builds a WMTS tile URL for the proxy path', () => {
    const url = mapilioWmtsTileUrl('mapilio:map_points', { z: 14, x: 8801, y: 5372 })
    expect(url).toContain('/mapilio-geo/geoserver/gwc/service/wmts?')
    expect(url).toContain('LAYER=mapilio%3Amap_points')
    expect(url).toContain('TILECOL=8801')
    expect(url).toContain('TILEROW=5372')
    expect(url).not.toContain('geo.mapilio.com')
  })
})
