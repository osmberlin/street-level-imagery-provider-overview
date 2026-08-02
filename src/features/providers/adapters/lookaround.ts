import type { ProviderAdapter } from '@/features/providers/model'

/** Apple Maps Look Around deep link (no API key). */
export const lookAroundDeepLink = (lat: number, lng: number): string =>
  `https://maps.apple.com/look-around?coordinate=${lat},${lng}`

/**
 * Link-out-only provider: no official bulk coverage listing API.
 * Map clicks open Apple Maps Look Around at the clicked coordinate.
 */
export const lookaroundAdapter: ProviderAdapter = {
  id: 'lookaround',
  kind: 'photo',
  label: 'Apple Look Around',
  color: '#007AFF',
  minZoom: 0,
  defaultEnabled: false,
}
