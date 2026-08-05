import { useQuery } from '@tanstack/react-query'
import {
  fetchStreetViewMetadata,
  getGoogleMapsApiKey,
} from '@/street-imagery/providers/adapters/google-streetview'

export type ClickedPoint = { lng: number; lat: number }

export const streetViewMetadataQueryKey = (lng: number, lat: number) =>
  ['google-streetview-metadata', lng, lat] as const

export const useGoogleStreetViewClickPhoto = (
  clicked: ClickedPoint | null | undefined,
  gsvEnabled: boolean,
) => {
  const googleMapsApiKey = getGoogleMapsApiKey()

  return useQuery({
    queryKey: clicked
      ? streetViewMetadataQueryKey(clicked.lng, clicked.lat)
      : ['google-streetview-metadata', 'none'],
    queryFn: ({ signal }) => {
      if (!clicked) {
        return null
      }
      return fetchStreetViewMetadata(clicked.lat, clicked.lng, signal)
    },
    enabled: gsvEnabled && clicked != null && googleMapsApiKey != null,
    staleTime: 5 * 60 * 1000,
  })
}
