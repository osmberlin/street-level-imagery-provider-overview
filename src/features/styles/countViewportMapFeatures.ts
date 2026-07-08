import type { NormalizedMapFeature } from '@/features/providers/model'
import { APP_START_NOW } from '@/features/styles/ageBuckets'
import { emptyCategoryCounts, type CategoryCounts } from '@/features/styles/countViewportPhotos'
import { categoryIdForMapFeature, type StyleMode } from '@/features/styles/styleDefinitions'

export const countMapFeaturesByCategory = (
  features: NormalizedMapFeature[],
  style: StyleMode,
  now: number = APP_START_NOW,
): CategoryCounts => {
  const counts = emptyCategoryCounts(style, 'mapFeature')

  for (const feature of features) {
    const categoryId = categoryIdForMapFeature(style, feature, now)
    counts[categoryId] += 1
  }

  return counts
}
