import { describe, expect, it } from 'vitest'
import { serializeMapParam } from '@/app/mapParam'
import { mergeAppSearchForNavigate } from '@/app/searchNavigation'
import { DEFAULT_MAP, type AppSearch } from '@/app/searchSchema'
import { DEFAULT_PROVIDER_IDS } from '@/street-imagery/providers/registry'

const baseSearch: AppSearch = {
  map: serializeMapParam(DEFAULT_MAP),
  providers: [...DEFAULT_PROVIDER_IDS],
  style: 'photoType',
  photoTypes: ['flat', 'pano'],
  leftPanel: 'open',
  rightPanel: 'open',
}

describe('mergeAppSearchForNavigate', () => {
  it('keeps map as a slash string when partial update does not touch map', () => {
    const merged = mergeAppSearchForNavigate(baseSearch, {
      clicked: { lng: 13.4, lat: 52.5 },
    })

    expect(merged.map).toBe('14/52.52/13.405')
    expect(typeof merged.map).toBe('string')
  })

  it('keeps map as a string when already serialized', () => {
    const merged = mergeAppSearchForNavigate(baseSearch, {
      map: '15/52.52/13.405',
      style: 'age',
    })

    expect(merged.map).toBe('15/52.52/13.405')
    expect(merged.style).toBe('age')
  })

  it('serializes map when passed as a MapParam object', () => {
    const merged = mergeAppSearchForNavigate(baseSearch, {
      map: { zoom: 15.678, lat: 52.520008, lng: 13.404954 },
    })

    expect(merged.map).toBe('15.7/52.52/13.405')
  })

  it('serializes bearing and pitch when present', () => {
    const merged = mergeAppSearchForNavigate(baseSearch, {
      map: { zoom: 17, lat: 52.5, lng: 13.4, bearing: 45, pitch: 30 },
    })

    expect(merged.map).toBe('17/52.5/13.4/45/30')
  })
})
