import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchStreetViewMetadata,
  normalizeStreetViewMetadata,
  parseGoogleStreetViewDate,
  type StreetViewMetadataResponse,
} from '@/features/providers/adapters/google-streetview'

const okFixture: StreetViewMetadataResponse = {
  status: 'OK',
  date: '2021-08',
  pano_id: 'pano-abc123',
  location: { lat: 37.421755, lng: -122.0838 },
}

describe('parseGoogleStreetViewDate', () => {
  it('parses YYYY-MM dates as the first day of the month', () => {
    expect(parseGoogleStreetViewDate('2021-08')).toBe(Date.parse('2021-08-01'))
  })

  it('returns null for invalid values', () => {
    expect(parseGoogleStreetViewDate('')).toBeNull()
    expect(parseGoogleStreetViewDate(undefined)).toBeNull()
  })
})

describe('normalizeStreetViewMetadata', () => {
  it('maps OK metadata to a normalized photo', () => {
    expect(normalizeStreetViewMetadata(okFixture, -122.1, 37.4)).toEqual({
      photoId: 'pano-abc123',
      sequenceId: null,
      capturedAt: Date.parse('2021-08-01'),
      isPano: true,
      heading: null,
      lngLat: [-122.0838, 37.421755],
    })
  })

  it('falls back to click coordinates and a coordinate photoId when pano_id is missing', () => {
    expect(normalizeStreetViewMetadata({ status: 'OK' }, 2.3522, 48.8566)).toEqual({
      photoId: '48.8566,2.3522',
      sequenceId: null,
      capturedAt: null,
      isPano: true,
      heading: null,
      lngLat: [2.3522, 48.8566],
    })
  })

  it('returns null for ZERO_RESULTS', () => {
    expect(normalizeStreetViewMetadata({ status: 'ZERO_RESULTS' }, 0, 0)).toBeNull()
  })
})

describe('fetchStreetViewMetadata', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns null when the API key is missing', async () => {
    vi.unstubAllEnvs()
    await expect(
      fetchStreetViewMetadata(37.4, -122.1, new AbortController().signal),
    ).resolves.toBeNull()
  })

  it('returns a normalized photo for OK metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => okFixture,
      }),
    )

    await expect(
      fetchStreetViewMetadata(37.4, -122.1, new AbortController().signal),
    ).resolves.toEqual({
      providerId: 'google-streetview',
      photoId: 'pano-abc123',
      sequenceId: null,
      capturedAt: Date.parse('2021-08-01'),
      isPano: true,
      heading: null,
      lngLat: [-122.0838, 37.421755],
    })
  })

  it('returns null for ZERO_RESULTS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS' }),
      }),
    )

    await expect(fetchStreetViewMetadata(0, 0, new AbortController().signal)).resolves.toBeNull()
  })

  it('throws for REQUEST_DENIED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'REQUEST_DENIED' }),
      }),
    )

    await expect(
      fetchStreetViewMetadata(37.4, -122.1, new AbortController().signal),
    ).rejects.toThrow('Google Street View metadata: REQUEST_DENIED')
  })
})
