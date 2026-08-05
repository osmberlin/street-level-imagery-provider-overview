import { describe, expect, it } from 'vitest'
import {
  mapParamFallback,
  parseMapParam,
  roundPositionForURL,
  serializeMapParam,
  coerceMapParam,
} from '@/app/mapParam'
import { routerSearch } from '@/app/routerSearch'

describe('mapParam', () => {
  it('round-trips zoom/lat/lng through parse and serialize', () => {
    const input = { zoom: 15.678, lat: 52.520008, lng: 13.404954 }
    const serialized = serializeMapParam(input)
    expect(parseMapParam(serialized)).toEqual({
      zoom: 15.7,
      lat: 52.52,
      lng: 13.405,
    })
  })

  it('parses and serializes bearing and pitch', () => {
    expect(parseMapParam('13/48.1/9.2/45/60')).toEqual({
      zoom: 13,
      lat: 48.1,
      lng: 9.2,
      bearing: 45,
      pitch: 60,
    })
    expect(serializeMapParam({ zoom: 13, lat: 48.1, lng: 9.2, bearing: 45, pitch: 60 })).toBe(
      '13/48.1/9.2/45/60',
    )
    expect(serializeMapParam({ zoom: 13, lat: 48.1, lng: 9.2, bearing: 0, pitch: 0 })).toBe(
      '13/48.1/9.2/0/0',
    )
    expect(serializeMapParam({ zoom: 13, lat: 48.1, lng: 9.2, bearing: 45 })).toBe('13/48.1/9.2')
  })

  it('coerces legacy JSON map objects from dirty share URLs', () => {
    expect(coerceMapParam({ zoom: 17.9, lat: 52.50968, lng: 13.4156 })).toEqual({
      zoom: 17.9,
      lat: 52.50968,
      lng: 13.4156,
    })
    expect(coerceMapParam({ zoom: 13, lat: 48.1, lng: 9.2, bearing: 45, pitch: 60 })).toEqual({
      zoom: 13,
      lat: 48.1,
      lng: 9.2,
      bearing: 45,
      pitch: 60,
    })
  })

  it('serializes readable map URLs without encoding slashes', () => {
    const serialized = serializeMapParam(mapParamFallback)
    const stringified = routerSearch.stringify({ map: serialized })

    expect(serialized).toBe('14/52.52/13.405')
    expect(stringified).toContain('map=14/52.52/13.405')
    expect(stringified).not.toContain('%2F')
  })

  it('rejects invalid map strings', () => {
    expect(parseMapParam('@52.8,13.6,12.5z')).toBeNull()
    expect(parseMapParam('not-a-viewport')).toBeNull()
  })

  it('rounds zoom to one decimal and lat/lng by zoom band', () => {
    const [lat, lng, zoom] = roundPositionForURL(52.520008123, 13.404954321, 14.567)

    expect(zoom).toBe(14.6)
    expect(lat).toBe(52.52)
    expect(lng).toBe(13.405)
  })
})
