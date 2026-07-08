import type { DataDrivenPropertyValueSpecification, ExpressionSpecification } from 'maplibre-gl'
import type { AppSearch } from '@/app/searchSchema'
import {
  AGE_THRESHOLD_2Y_MS,
  AGE_THRESHOLD_4Y_MS,
  ageBucketId,
  type AgeBucketId,
} from '@/features/styles/ageBuckets'

export type StyleMode = AppSearch['style']

export type PhotoTypeCategoryId = 'panorama' | 'flat' | 'unknown'
export type MapFeatureCategoryId = 'feature' | AgeBucketId

export type StyleCategoryId = PhotoTypeCategoryId | AgeBucketId | MapFeatureCategoryId

export type LegendCategory = {
  id: StyleCategoryId
  label: string
  color: string
  /** MapLibre expression fragment matching this category (for circle-color). */
  matchExpression: ExpressionSpecification
}

export type StyleDefinition = {
  id: StyleMode
  label: string
  categories: LegendCategory[]
  circleColorExpression: DataDrivenPropertyValueSpecification<string>
}

export const PHOTO_TYPE_COLORS = {
  panorama: '#2563eb',
  flat: '#16a34a',
  unknown: '#9ca3af',
} as const

export const MAP_FEATURE_COLORS = {
  feature: '#7c3aed',
} as const

export const AGE_COLORS = {
  current: '#05CB63',
  '2y4y': '#FFC01B',
  older4y: '#F77E5E',
  unknown: '#9ca3af',
} as const

export const photoTypeCategoryId = (isPano: boolean | null): PhotoTypeCategoryId => {
  if (isPano === true) {
    return 'panorama'
  }

  if (isPano === false) {
    return 'flat'
  }

  return 'unknown'
}

const photoTypeCategories: LegendCategory[] = [
  {
    id: 'panorama',
    label: 'Panorama',
    color: PHOTO_TYPE_COLORS.panorama,
    matchExpression: ['==', ['get', 'isPano'], true],
  },
  {
    id: 'flat',
    label: 'Flat',
    color: PHOTO_TYPE_COLORS.flat,
    matchExpression: ['==', ['get', 'isPano'], false],
  },
  {
    id: 'unknown',
    label: 'Unknown',
    color: PHOTO_TYPE_COLORS.unknown,
    matchExpression: ['==', ['get', 'isPano'], null],
  },
]

const ageCategories: LegendCategory[] = [
  {
    id: 'current',
    label: '≤ 2 years',
    color: AGE_COLORS.current,
    matchExpression: ['>=', ['get', 'capturedAt'], AGE_THRESHOLD_2Y_MS],
  },
  {
    id: '2y4y',
    label: '2–4 years',
    color: AGE_COLORS['2y4y'],
    matchExpression: [
      'all',
      ['>=', ['get', 'capturedAt'], AGE_THRESHOLD_4Y_MS],
      ['<', ['get', 'capturedAt'], AGE_THRESHOLD_2Y_MS],
    ],
  },
  {
    id: 'older4y',
    label: '> 4 years',
    color: AGE_COLORS.older4y,
    matchExpression: ['<', ['get', 'capturedAt'], AGE_THRESHOLD_4Y_MS],
  },
  {
    id: 'unknown',
    label: 'Unknown',
    color: AGE_COLORS.unknown,
    matchExpression: ['==', ['get', 'capturedAt'], null],
  },
]

const photoTypeCircleColor: DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'isPano'], true],
  PHOTO_TYPE_COLORS.panorama,
  ['==', ['get', 'isPano'], false],
  PHOTO_TYPE_COLORS.flat,
  PHOTO_TYPE_COLORS.unknown,
]

const ageCircleColor: DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'capturedAt'], null],
  AGE_COLORS.unknown,
  [
    'step',
    ['get', 'capturedAt'],
    AGE_COLORS.older4y,
    AGE_THRESHOLD_4Y_MS,
    AGE_COLORS['2y4y'],
    AGE_THRESHOLD_2Y_MS,
    AGE_COLORS.current,
  ],
]

export const STYLE_DEFINITIONS: Record<StyleMode, StyleDefinition> = {
  photoType: {
    id: 'photoType',
    label: 'Photo type',
    categories: photoTypeCategories,
    circleColorExpression: photoTypeCircleColor,
  },
  age: {
    id: 'age',
    label: 'Age',
    categories: ageCategories,
    circleColorExpression: ageCircleColor,
  },
}

const mapFeaturePhotoTypeCategories: LegendCategory[] = [
  {
    id: 'feature',
    label: 'Feature',
    color: MAP_FEATURE_COLORS.feature,
    matchExpression: ['has', 'featureId'],
  },
]

const mapFeatureAgeCategories: LegendCategory[] = ageCategories.map((category) => ({
  ...category,
  matchExpression:
    category.id === 'unknown'
      ? (['==', ['get', 'lastSeenAt'], null] as const)
      : category.id === 'current'
        ? (['>=', ['get', 'lastSeenAt'], AGE_THRESHOLD_2Y_MS] as const)
        : category.id === '2y4y'
          ? ([
              'all',
              ['>=', ['get', 'lastSeenAt'], AGE_THRESHOLD_4Y_MS],
              ['<', ['get', 'lastSeenAt'], AGE_THRESHOLD_2Y_MS],
            ] as const)
          : (['<', ['get', 'lastSeenAt'], AGE_THRESHOLD_4Y_MS] as const),
}))

const mapFeaturePhotoTypeCircleColor: DataDrivenPropertyValueSpecification<string> =
  MAP_FEATURE_COLORS.feature

const mapFeatureAgeCircleColor: DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'lastSeenAt'], null],
  AGE_COLORS.unknown,
  [
    'step',
    ['get', 'lastSeenAt'],
    AGE_COLORS.older4y,
    AGE_THRESHOLD_4Y_MS,
    AGE_COLORS['2y4y'],
    AGE_THRESHOLD_2Y_MS,
    AGE_COLORS.current,
  ],
]

export const MAP_FEATURE_STYLE_DEFINITIONS: Record<StyleMode, StyleDefinition> = {
  photoType: {
    id: 'photoType',
    label: 'Photo type',
    categories: mapFeaturePhotoTypeCategories,
    circleColorExpression: mapFeaturePhotoTypeCircleColor,
  },
  age: {
    id: 'age',
    label: 'Age',
    categories: mapFeatureAgeCategories,
    circleColorExpression: mapFeatureAgeCircleColor,
  },
}

export const getMapFeatureStyleDefinition = (style: StyleMode): StyleDefinition =>
  MAP_FEATURE_STYLE_DEFINITIONS[style]

export const categoryIdForMapFeature = (
  style: StyleMode,
  feature: { lastSeenAt: number | null },
  now: number,
): StyleCategoryId => (style === 'photoType' ? 'feature' : ageBucketId(feature.lastSeenAt, now))

export const getStyleDefinition = (style: StyleMode): StyleDefinition => STYLE_DEFINITIONS[style]

export const categoryIdForPhoto = (
  style: StyleMode,
  photo: { capturedAt: number | null; isPano: boolean | null },
  now: number,
): StyleCategoryId =>
  style === 'photoType' ? photoTypeCategoryId(photo.isPano) : ageBucketId(photo.capturedAt, now)
