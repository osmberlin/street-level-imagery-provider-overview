import { describe, expect, it } from 'vitest'
import type { NormalizedPhoto } from '@/features/providers/model'
import { ageBucketId } from '@/features/styles/ageBuckets'
import { countPhotosByCategory } from '@/features/styles/countViewportPhotos'
import { photoTypeCategoryId } from '@/features/styles/styleDefinitions'

const FIXED_NOW = Date.UTC(2026, 6, 8, 12, 0, 0)

const yearsBefore = (years: number): number => {
  const date = new Date(FIXED_NOW)
  date.setFullYear(date.getFullYear() - years)
  return date.getTime()
}

describe('ageBucketId', () => {
  it('returns unknown for null capturedAt', () => {
    expect(ageBucketId(null, FIXED_NOW)).toBe('unknown')
  })

  it('classifies photos within 2 years as current', () => {
    expect(ageBucketId(yearsBefore(1), FIXED_NOW)).toBe('current')
    expect(ageBucketId(yearsBefore(2), FIXED_NOW)).toBe('current')
  })

  it('classifies photos between 2 and 4 years as 2y4y', () => {
    expect(ageBucketId(yearsBefore(3), FIXED_NOW)).toBe('2y4y')
    expect(ageBucketId(yearsBefore(4), FIXED_NOW)).toBe('2y4y')
  })

  it('classifies photos older than 4 years as older4y', () => {
    expect(ageBucketId(yearsBefore(5), FIXED_NOW)).toBe('older4y')
    expect(ageBucketId(yearsBefore(4) - 1, FIXED_NOW)).toBe('older4y')
  })
})

describe('photoTypeCategoryId', () => {
  it('maps isPano true/false/null to panorama, flat, and unknown', () => {
    expect(photoTypeCategoryId(true)).toBe('panorama')
    expect(photoTypeCategoryId(false)).toBe('flat')
    expect(photoTypeCategoryId(null)).toBe('unknown')
  })
})

describe('countPhotosByCategory', () => {
  const photo = (
    overrides: Partial<NormalizedPhoto> & Pick<NormalizedPhoto, 'photoId'>,
  ): NormalizedPhoto => ({
    providerId: 'mapillary',
    sequenceId: 'seq-1',
    capturedAt: yearsBefore(1),
    isPano: false,
    heading: null,
    lngLat: [13.4, 52.5],
    ...overrides,
  })

  it('counts photo type categories from a synthetic photo array', () => {
    const photos: NormalizedPhoto[] = [
      photo({ photoId: 'p1', isPano: true }),
      photo({ photoId: 'p2', isPano: true }),
      photo({ photoId: 'p3', isPano: false }),
      photo({ photoId: 'p4', isPano: null }),
    ]

    expect(countPhotosByCategory(photos, 'photoType', FIXED_NOW)).toEqual({
      panorama: 2,
      flat: 1,
      unknown: 1,
    })
  })

  it('counts age buckets from a synthetic photo array', () => {
    const photos: NormalizedPhoto[] = [
      photo({ photoId: 'p1', capturedAt: yearsBefore(1) }),
      photo({ photoId: 'p2', capturedAt: yearsBefore(3) }),
      photo({ photoId: 'p3', capturedAt: yearsBefore(5) }),
      photo({ photoId: 'p4', capturedAt: null }),
    ]

    expect(countPhotosByCategory(photos, 'age', FIXED_NOW)).toEqual({
      current: 1,
      '2y4y': 1,
      older4y: 1,
      unknown: 1,
    })
  })
})
