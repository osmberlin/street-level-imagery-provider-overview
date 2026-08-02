import { describe, expect, it } from 'vitest'
import { getAppleMapKitToken } from '@/features/viewer/mapkitLoader'

describe('getAppleMapKitToken', () => {
  it('returns undefined when VITE_APPLE_MAPKIT_TOKEN is unset or empty', () => {
    expect(getAppleMapKitToken()).toBeUndefined()
  })
})
