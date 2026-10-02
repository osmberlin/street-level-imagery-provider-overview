import { describe, expect, it } from 'vitest'
import { serializeMapParam } from '@/app/mapParam'
import { routerSearch } from '@/app/routerSearch'
import { DEFAULT_PROVIDER_IDS } from '@/app/searchSchema'
import {
  defaultDateFrom,
  DEFAULT_MAP,
  DEFAULT_PHOTO_TYPES,
  appSearchSchema,
  getMapParamFromSearch,
  parseAppSearch,
  serializeAppSearch,
} from '@/app/searchSchema'

describe('appSearchSchema', () => {
  it('applies defaults for an empty search object', () => {
    const parsed = parseAppSearch({})

    expect(parsed.map).toBe(serializeMapParam(DEFAULT_MAP))
    expect(getMapParamFromSearch(parsed)).toEqual(DEFAULT_MAP)
    expect(parsed.providers).toEqual([...DEFAULT_PROVIDER_IDS])
    expect(parsed.style).toBe('photoType')
    expect(parsed.photoTypes).toEqual([...DEFAULT_PHOTO_TYPES])
    expect(parsed.leftPanel).toBe('open')
    expect(parsed.date).toEqual({ from: defaultDateFrom() })
    expect(parsed.clicked).toBeUndefined()
    expect(parsed.selected).toBeUndefined()
  })

  it('accepts leftPanel=closed and omits the open default from serialized search', () => {
    const closed = parseAppSearch({ leftPanel: 'closed' })
    expect(closed.leftPanel).toBe('closed')
    expect(serializeAppSearch(closed).leftPanel).toBe('closed')

    const open = parseAppSearch({})
    expect(serializeAppSearch(open).leftPanel).toBeUndefined()
  })

  it('defaults to the last 2 years, keeps "all dates" as an explicit empty date', () => {
    expect(defaultDateFrom(new Date('2026-09-28T12:00:00Z'))).toBe('2024-09-28')
    expect(serializeAppSearch(parseAppSearch({})).date).toBeUndefined()
    const all = parseAppSearch({ date: {} })
    expect(all.date).toEqual({})
    expect(serializeAppSearch(all).date).toEqual({})
  })

  it('keeps the selected map feature id as a string', () => {
    expect(parseAppSearch({ feature: '1014865383456284' }).feature).toBe('1014865383456284')
    expect(parseAppSearch({ feature: 1014865383456284 }).feature).toBe('1014865383456284')
    expect(parseAppSearch({ feature: 'abc' }).feature).toBeUndefined()
    expect(serializeAppSearch(parseAppSearch({ feature: '12' })).feature).toBe('12')
  })

  it('keeps map as a slash string in validated search', () => {
    const parsed = parseAppSearch({ map: '15.678/52.520008/13.404954' })

    expect(parsed.map).toBe('15.7/52.52/13.405')
    expect(typeof parsed.map).toBe('string')
  })

  it('round-trips through serialize and router search stringify/parse', () => {
    const input = appSearchSchema.parse({
      map: '15.678/52.520008/13.404954',
      providers: ['mapillary', 'panoramax', 'mapillary-signs'],
      style: 'age',
      photoTypes: ['pano'],
      date: { from: '2024-01-01', to: '2025-06-01' },
      clicked: { lng: 13.4, lat: 52.5 },
      selected: {
        provider: 'mapillary',
        sequenceId: 'seq-1',
        photoId: 'photo-1',
      },
    })

    const serialized = serializeAppSearch(input)
    const stringified = routerSearch.stringify(serialized)
    const reparsed = parseAppSearch(routerSearch.parse(stringified))

    expect(reparsed.map).toBe('15.7/52.52/13.405')
    expect(getMapParamFromSearch(reparsed)).toEqual({ zoom: 15.7, lat: 52.52, lng: 13.405 })
    expect(reparsed.providers).toEqual(input.providers)
    expect(reparsed.style).toBe('age')
    expect(reparsed.photoTypes).toEqual(['pano'])
    expect(reparsed.date).toEqual(input.date)
    expect(reparsed.clicked).toEqual(input.clicked)
    expect(reparsed.selected).toEqual(input.selected)
    expect(stringified).toContain('map=15.7/52.52/13.405')
    expect(stringified).not.toContain('%2F')
    expect(stringified).not.toContain('{"zoom"')
  })

  it('accepts legacy JSON map objects and rewrites to slash form', () => {
    const parsed = parseAppSearch({
      map: { zoom: 17.9, lat: 52.50968, lng: 13.4156 },
    })

    expect(parsed.map).toBe('17.9/52.50968/13.4156')
    expect(routerSearch.stringify(serializeAppSearch(parsed))).toContain(
      'map=17.9/52.50968/13.4156',
    )
  })

  it('falls back to the default map for invalid map values', () => {
    const parsed = parseAppSearch({ map: 'not-a-viewport' })
    expect(parsed.map).toBe(serializeMapParam(DEFAULT_MAP))
  })

  it('omits default photoTypes from serialized search', () => {
    const serialized = serializeAppSearch(
      appSearchSchema.parse({
        photoTypes: [...DEFAULT_PHOTO_TYPES],
      }),
    )

    expect(serialized.photoTypes).toBeUndefined()
  })

  it('serializes map as a zoom/lat/lng string', () => {
    const serialized = serializeAppSearch(
      parseAppSearch({
        map: '14.567/52.520008123/13.404954321',
      }),
    )

    expect(serialized.map).toBe('14.6/52.52/13.405')
    expect(serializeMapParam(DEFAULT_MAP)).toBe('14/52.52/13.405')
  })

  it('recovers invalid style values to the default', () => {
    const parsed = parseAppSearch({ style: 'invalid' })
    expect(parsed.style).toBe('photoType')
  })

  it('degrades an invalid selected provider to undefined', () => {
    const parsed = parseAppSearch({
      selected: { provider: 'not-a-provider', photoId: '1' },
    })
    expect(parsed.selected).toBeUndefined()
  })

  it('degrades a malformed clicked value to undefined', () => {
    const parsed = parseAppSearch({ clicked: { lng: 'not-a-number', lat: 999 } })
    expect(parsed.clicked).toBeUndefined()
  })

  it('degrades a malformed date value to the default', () => {
    const parsed = parseAppSearch({ date: { from: 'nonsense' } })
    expect(parsed.date).toEqual({ from: defaultDateFrom() })
  })

  it('rejects impossible calendar dates', () => {
    const parsed = parseAppSearch({ date: { from: '2024-13-99' } })
    expect(parsed.date).toEqual({ from: defaultDateFrom() })
  })

  it('accepts real calendar dates including leap days', () => {
    const parsed = parseAppSearch({ date: { from: '2024-02-29', to: '2024-12-31' } })
    expect(parsed.date).toEqual({ from: '2024-02-29', to: '2024-12-31' })
  })

  it('strips browser-unavailable providers from parsed search', () => {
    const parsed = parseAppSearch({ providers: ['mapillary', 'mapilio'] })
    expect(parsed.providers).toEqual(['mapillary'])
  })

  it('keeps an explicit empty providers array', () => {
    const parsed = parseAppSearch({
      providers: [],
      style: 'photoType',
    })
    expect(parsed.providers).toEqual([])
  })

  it('serializes an empty providers array for the URL', () => {
    const serialized = serializeAppSearch(
      parseAppSearch({
        providers: [],
        style: 'photoType',
      }),
    )

    expect(serialized.providers).toEqual([])
    expect(
      parseAppSearch(routerSearch.parse(routerSearch.stringify(serialized))).providers,
    ).toEqual([])
  })

  it('maps legacy google-streetview provider id to streetview', () => {
    const parsed = parseAppSearch({ providers: ['google-streetview'] })
    expect(parsed.providers).toEqual(['streetview'])

    const serialized = serializeAppSearch(parsed)
    expect(serialized.providers).toEqual(['streetview'])
  })

  it('maps legacy google-streetview in selected provider to streetview', () => {
    const parsed = parseAppSearch({
      providers: ['streetview'],
      selected: {
        provider: 'google-streetview',
        photoId: 'pano-abc123',
      },
    })
    expect(parsed.selected).toEqual({
      provider: 'streetview',
      photoId: 'pano-abc123',
    })

    const serialized = serializeAppSearch(parsed)
    expect(serialized.selected).toEqual({
      provider: 'streetview',
      photoId: 'pano-abc123',
    })
  })

  it('keeps arrays and map readable after routerSearch.stringify', () => {
    const stringified = routerSearch.stringify(
      serializeAppSearch(
        parseAppSearch({
          map: '17.9/52.50968/13.4156',
          providers: ['panoramax', 'kartaview', 'streetside', 'vegbilder'],
          style: 'photoType',
          photoTypes: ['flat', 'pano'],
        }),
      ),
    )

    expect(stringified).toContain('map=17.9/52.50968/13.4156')
    expect(stringified).toContain('providers=["panoramax","kartaview","streetside","vegbilder"]')
    expect(stringified).not.toContain('%22')
    expect(stringified).not.toContain('%7B')
  })
})
