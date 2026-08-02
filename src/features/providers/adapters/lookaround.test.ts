import { describe, expect, it } from 'vitest'
import { lookAroundDeepLink, lookaroundAdapter } from '@/features/providers/adapters/lookaround'
import type { NormalizedPhoto } from '@/features/providers/model'
import { providerExternalLink } from '@/features/viewer/externalLinks'

describe('lookAroundDeepLink', () => {
  it('builds an Apple Maps Look Around URL from coordinates', () => {
    expect(lookAroundDeepLink(40.706974, -74.011281)).toBe(
      'https://maps.apple.com/look-around?coordinate=40.706974,-74.011281',
    )
  })

  it('preserves Berlin coordinates used in coverage checks', () => {
    expect(lookAroundDeepLink(52.52, 13.405)).toBe(
      'https://maps.apple.com/look-around?coordinate=52.52,13.405',
    )
  })
})

describe('lookaroundAdapter', () => {
  it('is a click-only photo provider without fetchPhotos', () => {
    expect(lookaroundAdapter.id).toBe('lookaround')
    expect(lookaroundAdapter.kind).toBe('photo')
    expect(lookaroundAdapter.defaultEnabled).toBe(false)
    expect(lookaroundAdapter.fetchPhotos).toBeUndefined()
  })
})

describe('providerExternalLink lookaround', () => {
  it('builds a Look Around deep link from photo coordinates', () => {
    const photo: NormalizedPhoto = {
      providerId: 'lookaround',
      photoId: 'click:52.52,13.405',
      sequenceId: null,
      capturedAt: null,
      isPano: true,
      heading: null,
      lngLat: [13.405, 52.52],
    }
    expect(providerExternalLink(photo)).toBe(
      'https://maps.apple.com/look-around?coordinate=52.52,13.405',
    )
  })
})
