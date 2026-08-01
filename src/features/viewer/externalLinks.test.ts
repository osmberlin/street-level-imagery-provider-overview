import { describe, expect, it } from 'vitest'
import type { NormalizedPhoto } from '@/features/providers/model'
import { providerExternalLink } from '@/features/viewer/externalLinks'

const googleStreetViewPhoto: NormalizedPhoto = {
  providerId: 'google-streetview',
  photoId: 'pano-abc123',
  sequenceId: null,
  capturedAt: Date.parse('2021-08-01'),
  isPano: true,
  heading: null,
  lngLat: [-122.0838, 37.421755],
}

describe('providerExternalLink', () => {
  it('builds a Google Maps panorama deep link from the photo viewpoint', () => {
    expect(providerExternalLink(googleStreetViewPhoto)).toBe(
      'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=37.421755,-122.0838',
    )
  })
})
