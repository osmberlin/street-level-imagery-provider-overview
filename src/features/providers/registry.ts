import { kartaviewAdapter } from '@/features/providers/adapters/kartaview'
import { mapilioAdapter } from '@/features/providers/adapters/mapilio'
import { mapillaryAdapter } from '@/features/providers/adapters/mapillary'
import { mapillaryMapFeaturesAdapter } from '@/features/providers/adapters/mapillary-map-features'
import { mapillarySignsAdapter } from '@/features/providers/adapters/mapillary-signs'
import { panoramaxAdapter } from '@/features/providers/adapters/panoramax'
import { streetsideAdapter } from '@/features/providers/adapters/streetside'
import { vegbilderAdapter } from '@/features/providers/adapters/vegbilder'
import type { ProviderAdapter, ProviderKind } from '@/features/providers/model'

export const PROVIDER_IDS = [
  'mapillary',
  'panoramax',
  'kartaview',
  'mapilio',
  'streetside',
  'vegbilder',
  'mapillary-signs',
  'mapillary-map-features',
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export type ProviderMeta = {
  id: ProviderId
  kind: ProviderKind
  label: string
  color: string
  minZoom: number
  sequencesMinZoom: number
  homepageUrl?: string
}

const PROVIDER_HOMEPAGE_URLS: Partial<Record<ProviderId, string>> = {
  mapillary: 'https://www.mapillary.com',
  panoramax: 'https://panoramax.xyz',
  kartaview: 'https://kartaview.org',
  mapilio: 'https://mapilio.com',
  streetside: 'https://www.bing.com/maps',
  vegbilder: 'https://vegbilder.atlas.vegvesen.no',
  'mapillary-signs': 'https://www.mapillary.com',
  'mapillary-map-features': 'https://www.mapillary.com',
}

export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  mapillaryAdapter,
  panoramaxAdapter,
  kartaviewAdapter,
  mapilioAdapter,
  streetsideAdapter,
  vegbilderAdapter,
  mapillarySignsAdapter,
  mapillaryMapFeaturesAdapter,
]

export const adapterById = Object.fromEntries(
  PROVIDER_ADAPTERS.map((adapter) => [adapter.id, adapter]),
) as Record<ProviderId, ProviderAdapter>

export const PROVIDERS: ProviderMeta[] = PROVIDER_ADAPTERS.map((adapter) => ({
  id: adapter.id,
  kind: adapter.kind,
  label: adapter.label,
  color: adapter.color,
  minZoom: adapter.minZoom,
  sequencesMinZoom: adapter.sequencesMinZoom ?? adapter.minZoom,
  homepageUrl: PROVIDER_HOMEPAGE_URLS[adapter.id],
}))

// Feature overlays (signs, map features) are so dense they bury the photo layers,
// so only photo providers are enabled by default.
export const DEFAULT_PROVIDER_IDS: ProviderId[] = PROVIDER_IDS.filter(
  (id) => adapterById[id].kind === 'photo',
)

export const providerById = Object.fromEntries(
  PROVIDERS.map((provider) => [provider.id, provider]),
) as Record<ProviderId, ProviderMeta>

export const photoLayerId = (providerId: ProviderId) => `photos-${providerId}`
export const featureLayerId = (providerId: ProviderId) => `features-${providerId}`
export const sequenceLayerId = (providerId: ProviderId) => `sequences-${providerId}`
export const photoSourceId = (providerId: ProviderId) => `photos-source-${providerId}`
export const featureSourceId = (providerId: ProviderId) => `features-source-${providerId}`
export const sequenceSourceId = (providerId: ProviderId) => `sequences-source-${providerId}`

export const isPhotoProviderId = (providerId: ProviderId): boolean =>
  adapterById[providerId].kind === 'photo'

export const isMapFeatureProviderId = (providerId: ProviderId): boolean =>
  adapterById[providerId].kind === 'mapFeature'
