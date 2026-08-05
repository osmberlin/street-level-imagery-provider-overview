import { z } from 'zod'
import {
  coerceMapParam,
  defaultMapSearchValue,
  mapParamFallback,
  serializeMapParam,
  type MapParam,
} from '@/app/mapParam'
import {
  DEFAULT_PROVIDER_IDS,
  isBrowserAvailableProvider,
  PROVIDER_IDS,
  type ProviderId,
} from '@/street-imagery/providers/registry'

const normalizeLegacyProviderId = (raw: unknown): unknown =>
  raw === 'google-streetview' ? 'streetview' : raw

const providerIdSchema = z.preprocess(normalizeLegacyProviderId, z.enum(PROVIDER_IDS))

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    if (year === undefined || month === undefined || day === undefined) {
      return false
    }
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, 'Invalid calendar date')

/**
 * Keep `map` as a slash string in validated search (tilda-geo).
 * Parsed objects would be JSON-stringified by the router and produce dirty URLs.
 */
const normalizeMapSearchParam = (raw: unknown, defaultValue: string) => {
  const parsed = coerceMapParam(raw)
  return parsed ? serializeMapParam(parsed) : defaultValue
}

const mapSearchSchema = z.preprocess(
  (raw) => normalizeMapSearchParam(raw, defaultMapSearchValue),
  z.string().default(defaultMapSearchValue).catch(defaultMapSearchValue),
)

const clickedSchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
})

const selectedSchema = z.object({
  provider: providerIdSchema,
  sequenceId: z.string().optional(),
  photoId: z.string().optional(),
  featureId: z.string().optional(),
})

const photoTypeSchema = z.enum(['flat', 'pano'])

const dateSearchSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
})

export const DEFAULT_PHOTO_TYPES = ['flat', 'pano'] as const

export const DEFAULT_MAP = mapParamFallback

export const LEFT_PANEL_DEFAULT = 'open' as const

export const appSearchSchema = z.object({
  map: mapSearchSchema,
  providers: z
    .array(providerIdSchema)
    .default(DEFAULT_PROVIDER_IDS)
    .catch(DEFAULT_PROVIDER_IDS)
    .transform((providers) => providers.filter(isBrowserAvailableProvider)),
  style: z.enum(['photoType', 'age']).default('photoType').catch('photoType'),
  photoTypes: z
    .array(photoTypeSchema)
    .default([...DEFAULT_PHOTO_TYPES])
    .catch([...DEFAULT_PHOTO_TYPES]),
  leftPanel: z.enum(['open', 'closed']).default(LEFT_PANEL_DEFAULT).catch(LEFT_PANEL_DEFAULT),
  date: dateSearchSchema.optional().catch(undefined),
  clicked: clickedSchema.optional().catch(undefined),
  selected: selectedSchema.optional().catch(undefined),
})

export type AppSearch = z.infer<typeof appSearchSchema>
export type { MapParam }

export const parseAppSearch = (raw: unknown): AppSearch => appSearchSchema.parse(raw)

export const getMapParamFromSearch = (search: Pick<AppSearch, 'map'>): MapParam =>
  coerceMapParam(search.map) ?? mapParamFallback

const isDefaultPhotoTypes = (photoTypes: AppSearch['photoTypes']) =>
  photoTypes.length === DEFAULT_PHOTO_TYPES.length &&
  DEFAULT_PHOTO_TYPES.every((type) => photoTypes.includes(type))

export const serializeAppSearch = (search: AppSearch): Record<string, unknown> => {
  const serialized: Record<string, unknown> = {
    map: typeof search.map === 'string' ? search.map : serializeMapParam(search.map),
    providers: search.providers,
    style: search.style,
  }

  if (!isDefaultPhotoTypes(search.photoTypes)) {
    serialized.photoTypes = search.photoTypes
  }

  if (search.leftPanel !== LEFT_PANEL_DEFAULT) {
    serialized.leftPanel = search.leftPanel
  }

  if (search.date?.from || search.date?.to) {
    serialized.date = search.date
  }

  if (search.clicked) {
    serialized.clicked = search.clicked
  }

  if (search.selected) {
    serialized.selected = search.selected
  }

  return serialized
}

export const isProviderId = (value: string): value is ProviderId =>
  (PROVIDER_IDS as readonly string[]).includes(value)
