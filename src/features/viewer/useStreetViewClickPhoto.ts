import { useQuery } from '@tanstack/react-query'
import {
  fetchStreetViewMetadata,
  getGoogleMapsApiKey,
} from '@/street-imagery/providers/adapters/streetview'

export type ClickedPoint = { lng: number; lat: number }

export const streetViewMetadataQueryKey = (lng: number, lat: number) =>
  ['streetview-metadata', lng, lat] as const

export const useStreetViewClickPhoto = (
  clicked: ClickedPoint | null | undefined,
  streetViewEnabled: boolean,
) => {
  const googleMapsApiKey = getGoogleMapsApiKey()

  return useQuery({
    queryKey: clicked
      ? streetViewMetadataQueryKey(clicked.lng, clicked.lat)
      : ['streetview-metadata', 'none'],
    queryFn: ({ signal }) => {
      if (!clicked) {
        return null
      }
      return fetchStreetViewMetadata(clicked.lat, clicked.lng, signal)
    },
    enabled: streetViewEnabled && clicked != null && googleMapsApiKey != null,
    staleTime: 5 * 60 * 1000,
  })
}
