import { describe, expect, it } from 'vitest'
import { routerSearch } from '@/app/routerSearch'
import {
  DEFAULT_MAP,
  DEFAULT_PHOTO_TYPES,
  appSearchSchema,
  parseAppSearch,
  roundMapForUrl,
  serializeAppSearch,
} from '@/app/searchSchema'

describe('appSearchSchema', () => {
  it('applies defaults for an empty search object', () => {
    const parsed = parseAppSearch({})

    expect(parsed.map).toEqual(DEFAULT_MAP)
    expect(parsed.providers).toEqual([
      'mapillary',
      'panoramax',
      'kartaview',
      'mapilio',
      'streetside',
      'vegbilder',
    ])
    expect(parsed.style).toBe('photoType')
    expect(parsed.photoTypes).toEqual([...DEFAULT_PHOTO_TYPES])
    expect(parsed.date).toBeUndefined()
    expect(parsed.clicked).toBeUndefined()
    expect(parsed.selected).toBeUndefined()
  })

  it('round-trips through serialize and router search stringify/parse', () => {
    const input = appSearchSchema.parse({
      map: { z: 15.678, lat: 52.520008, lon: 13.404954 },
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

    expect(reparsed.map).toEqual(roundMapForUrl(input.map))
    expect(reparsed.providers).toEqual(input.providers)
    expect(reparsed.style).toBe('age')
    expect(reparsed.photoTypes).toEqual(['pano'])
    expect(reparsed.date).toEqual(input.date)
    expect(reparsed.clicked).toEqual(input.clicked)
    expect(reparsed.selected).toEqual(input.selected)
  })

  it('omits default photoTypes from serialized search', () => {
    const serialized = serializeAppSearch(
      appSearchSchema.parse({
        photoTypes: [...DEFAULT_PHOTO_TYPES],
      }),
    )

    expect(serialized.photoTypes).toBeUndefined()
  })

  it('rounds map coordinates for stable URLs', () => {
    const rounded = roundMapForUrl({ z: 14.567, lat: 52.520008123, lon: 13.404954321 })

    expect(rounded.z).toBe(14.57)
    expect(rounded.lat).toBe(52.52)
    expect(rounded.lon).toBe(13.405)
  })

  it('recovers invalid style values to the default', () => {
    const parsed = parseAppSearch({ style: 'invalid' })
    expect(parsed.style).toBe('photoType')
  })

  it('validates selected provider against provider id enum', () => {
    expect(() =>
      parseAppSearch({
        selected: { provider: 'not-a-provider', photoId: '1' },
      }),
    ).toThrow()
  })
})
