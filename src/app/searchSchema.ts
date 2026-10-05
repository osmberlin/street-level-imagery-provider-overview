import {
  DEFAULT_STREET_IMAGERY_LOCALE,
  isBrowserAvailableProvider,
  PROVIDER_IDS,
  SIGN_GROUP_IDS,
  STREET_IMAGERY_LOCALES,
  type ProviderId,
} from '@osm-editor-kit/street-imagery'
import { z } from 'zod'
import {
  coerceMapParam,
  defaultMapSearchValue,
  mapParamFallback,
  serializeMapParam,
  type MapParam,
} from '@/app/mapParam'

/** Enabled without a `providers` param: the two open providers. The rest is one click away. */
export const DEFAULT_PROVIDER_IDS: ProviderId[] = ['mapillary', 'panoramax']

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

/** Traffic sign groups of the Mapillary signs layer (the package's `SIGN_GROUPS` + other). */
export { SIGN_GROUP_IDS }

/** Photos older than this are hidden by default; dense areas are unusable with all years. */
export const DEFAULT_MAX_AGE_YEARS = 2

/** ISO date `DEFAULT_MAX_AGE_YEARS` before today (UTC). */
export const defaultDateFrom = (now = new Date()): string => {
  const date = new Date(now)
  date.setUTCFullYear(date.getUTCFullYear() - DEFAULT_MAX_AGE_YEARS)
  return date.toISOString().slice(0, 10)
}

const defaultDate = () => ({ from: defaultDateFrom() })

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
  signGroups: z
    .array(z.enum(SIGN_GROUP_IDS))
    .default([...SIGN_GROUP_IDS])
    .catch([...SIGN_GROUP_IDS]),
  /** Map toggle: show clickable streets and suggest views for clicks on streets and spots. */
  streetViews: z.enum(['on', 'off']).default('off').catch('off'),
  /**
   * Viewer for Panoramax photos: the Mapillary viewer (default) or Panoramax's own. No control in
   * the app; set `panoramaxViewer="panoramax"` in the URL to compare the two.
   */
  panoramaxViewer: z.enum(['mapillary', 'panoramax']).default('mapillary').catch('mapillary'),
  /** Language of the texts and dates. */
  locale: z
    .enum(STREET_IMAGERY_LOCALES)
    .default(DEFAULT_STREET_IMAGERY_LOCALE)
    .catch(DEFAULT_STREET_IMAGERY_LOCALE),
  leftPanel: z.enum(['open', 'closed']).default(LEFT_PANEL_DEFAULT).catch(LEFT_PANEL_DEFAULT),
  /** Missing → last 2 years. `{}` (no from/to) → all dates. */
  date: dateSearchSchema.default(defaultDate).catch(defaultDate),
  clicked: clickedSchema.optional().catch(undefined),
  selected: selectedSchema.optional().catch(undefined),
  /** Selected Mapillary map feature (sign, object); its photos show in the viewer. */
  feature: z
    .preprocess(
      // A hand-written `feature=123` arrives as a number; ids beyond 2^53 would lose digits.
      (raw) => (typeof raw === 'number' && Number.isSafeInteger(raw) ? String(raw) : raw),
      z.string().regex(/^\d+$/),
    )
    .optional()
    .catch(undefined),
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

  if (search.signGroups.length !== SIGN_GROUP_IDS.length) {
    serialized.signGroups = search.signGroups
  }

  if (search.streetViews === 'on') {
    serialized.streetViews = search.streetViews
  }

  if (search.panoramaxViewer !== 'mapillary') {
    serialized.panoramaxViewer = search.panoramaxViewer
  }

  if (search.locale !== DEFAULT_STREET_IMAGERY_LOCALE) {
    serialized.locale = search.locale
  }

  if (search.leftPanel !== LEFT_PANEL_DEFAULT) {
    serialized.leftPanel = search.leftPanel
  }

  const isDefaultDate = search.date.from === defaultDateFrom() && !search.date.to
  if (!isDefaultDate) {
    serialized.date = search.date
  }

  if (search.clicked) {
    serialized.clicked = search.clicked
  }

  if (search.selected) {
    serialized.selected = search.selected
  }

  if (search.feature) {
    serialized.feature = search.feature
  }

  return serialized
}

export const isProviderId = (value: string): value is ProviderId =>
  (PROVIDER_IDS as readonly string[]).includes(value)
