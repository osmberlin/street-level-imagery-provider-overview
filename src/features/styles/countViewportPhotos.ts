import type { NormalizedPhoto } from '@/features/providers/model'
import { APP_START_NOW } from '@/features/styles/ageBuckets'
import {
  categoryIdForPhoto,
  getStyleDefinition,
  type StyleCategoryId,
  type StyleMode,
} from '@/features/styles/styleDefinitions'
import { getMapFeatureStyleDefinition } from '@/features/styles/styleDefinitions'

export type CategoryCounts = Record<StyleCategoryId, number>

export const emptyCategoryCounts = (
  style: StyleMode,
  kind: 'photo' | 'mapFeature' = 'photo',
): CategoryCounts => {
  const counts = {} as CategoryCounts
  const definition =
    kind === 'mapFeature' ? getMapFeatureStyleDefinition(style) : getStyleDefinition(style)
  for (const category of definition.categories) {
    counts[category.id] = 0
  }
  return counts
}

export const countPhotosByCategory = (
  photos: NormalizedPhoto[],
  style: StyleMode,
  now: number = APP_START_NOW,
): CategoryCounts => {
  const counts = emptyCategoryCounts(style)

  for (const photo of photos) {
    const categoryId = categoryIdForPhoto(style, photo, now)
    counts[categoryId] += 1
  }

  return counts
}

export const totalPhotoCount = (counts: CategoryCounts): number =>
  Object.values(counts).reduce((sum, count) => sum + count, 0)
