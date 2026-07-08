import type { Feature } from 'geojson'
import { describe, expect, it } from 'vitest'
import {
  normalizeMapillaryImageFeature,
  normalizeMapillarySequenceFeature,
} from '@/features/providers/adapters/mapillary'

describe('normalizeMapillaryImageFeature', () => {
  it('maps MVT image properties to normalized photos', () => {
    const feature: Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [13.4, 52.5] },
      properties: {
        id: 12345,
        sequence_id: 'seq-abc',
        captured_at: 1_700_000_000_000,
        compass_angle: 90,
        is_pano: true,
      },
    }

    expect(normalizeMapillaryImageFeature(feature)).toEqual({
      photoId: '12345',
      sequenceId: 'seq-abc',
      capturedAt: 1_700_000_000_000,
      isPano: true,
      heading: 90,
      lngLat: [13.4, 52.5],
    })
  })

  it('returns null for non-point geometries', () => {
    const feature: Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [13.4, 52.5],
          [13.41, 52.51],
        ],
      },
      properties: { id: 1 },
    }

    expect(normalizeMapillaryImageFeature(feature)).toBeNull()
  })
})

describe('normalizeMapillarySequenceFeature', () => {
  it('maps sequence line features', () => {
    const feature: Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [13.4, 52.5],
          [13.41, 52.51],
        ],
      },
      properties: { id: 'sequence-1' },
    }

    expect(normalizeMapillarySequenceFeature(feature)).toEqual({
      sequenceId: 'sequence-1',
      geometry: feature.geometry,
    })
  })
})
