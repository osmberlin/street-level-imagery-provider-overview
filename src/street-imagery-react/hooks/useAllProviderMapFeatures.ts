import { useProviderMapFeatures } from '@/street-imagery-react/hooks/useProviderData'
import type { DateRange } from '@/street-imagery/filters/searchFilters'
import { mapFeatureMatchesDateRange } from '@/street-imagery/filters/searchFilters'
import type { Bbox, NormalizedMapFeature } from '@/street-imagery/providers/model'
import { PROVIDER_IDS, type ProviderId } from '@/street-imagery/providers/registry'

const useProviderMapFeaturesMaybe = (
  providerId: ProviderId,
  enabled: boolean,
  bbox: Bbox | null,
  zoom: number,
) => useProviderMapFeatures(providerId, enabled ? bbox : null, zoom)

export const useAllProviderMapFeatures = (
  providerIds: ProviderId[],
  bbox: Bbox | null,
  zoom: number,
  date?: DateRange,
): NormalizedMapFeature[] => {
  const enabled = new Set(providerIds)

  const queries = PROVIDER_IDS.map((providerId) => ({
    providerId,
    query: useProviderMapFeaturesMaybe(providerId, enabled.has(providerId), bbox, zoom),
  }))

  return queries.flatMap(({ query }) => {
    const data = query.data ?? []
    return data.filter((feature) => mapFeatureMatchesDateRange(feature, date))
  })
}

export const useAllProviderMapFeaturesLoading = (
  providerIds: ProviderId[],
  bbox: Bbox | null,
  zoom: number,
): { isLoading: boolean; isFetching: boolean } => {
  const enabled = new Set(providerIds)

  const queries = PROVIDER_IDS.map((providerId) => ({
    providerId,
    query: useProviderMapFeaturesMaybe(providerId, enabled.has(providerId), bbox, zoom),
  }))

  const activeQueries = queries.filter(({ providerId }) => enabled.has(providerId))

  return {
    isLoading: activeQueries.some(({ query }) => query.isLoading),
    isFetching: activeQueries.some(({ query }) => query.isFetching),
  }
}
