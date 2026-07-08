import type { AppSearch } from '@/app/searchSchema'
import { useProviderMapFeatures } from '@/features/data/useProviderData'
import { mapFeatureMatchesDateRange } from '@/features/filters/searchFilters'
import type { Bbox, NormalizedMapFeature } from '@/features/providers/model'
import { PROVIDER_IDS, type ProviderId } from '@/features/providers/registry'

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
  date?: AppSearch['date'],
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
