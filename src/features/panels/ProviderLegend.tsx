import { useMemo } from 'react'
import type { AppSearch } from '@/app/searchSchema'
import { useProviderMapFeatures, useProviderPhotos } from '@/features/data/useProviderData'
import { mapFeatureMatchesDateRange, photoMatchesFilters } from '@/features/filters/searchFilters'
import type { Bbox } from '@/features/providers/model'
import { adapterById, providerById, type ProviderId } from '@/features/providers/registry'
import { countMapFeaturesByCategory } from '@/features/styles/countViewportMapFeatures'
import { countPhotosByCategory, totalPhotoCount } from '@/features/styles/countViewportPhotos'
import {
  getMapFeatureStyleDefinition,
  getStyleDefinition,
} from '@/features/styles/styleDefinitions'

type ProviderLegendProps = {
  providerId: ProviderId
  style: AppSearch['style']
  bbox: Bbox | null
  zoom: number
  photoTypes?: AppSearch['photoTypes']
  date?: AppSearch['date']
}

export const ProviderLegend = ({
  providerId,
  style,
  bbox,
  zoom,
  photoTypes,
  date,
}: ProviderLegendProps) => {
  const meta = providerById[providerId]
  const adapter = adapterById[providerId]
  const { data: photos = [] } = useProviderPhotos(providerId, bbox, zoom)
  const { data: mapFeatures = [] } = useProviderMapFeatures(providerId, bbox, zoom)

  const isMapFeature = adapter.kind === 'mapFeature'
  const styleDefinition = isMapFeature
    ? getMapFeatureStyleDefinition(style)
    : getStyleDefinition(style)

  const filteredPhotos = useMemo(
    () => photos.filter((photo) => photoMatchesFilters(photo, photoTypes, date)),
    [photos, photoTypes, date],
  )

  const filteredMapFeatures = useMemo(
    () => mapFeatures.filter((feature) => mapFeatureMatchesDateRange(feature, date)),
    [mapFeatures, date],
  )

  const counts = useMemo(() => {
    if (isMapFeature) {
      return countMapFeaturesByCategory(filteredMapFeatures, style)
    }
    return countPhotosByCategory(filteredPhotos, style)
  }, [filteredMapFeatures, filteredPhotos, isMapFeature, style])

  const total = totalPhotoCount(counts)
  const belowMinZoom = zoom < meta.minZoom
  const isEmpty = !belowMinZoom && total === 0

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="truncate text-sm font-medium text-slate-800">{meta.label}</span>
        </div>
        <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600 tabular-nums">
          {belowMinZoom ? '—' : total}
        </span>
      </div>

      {belowMinZoom ? (
        <p className="mt-1.5 text-xs text-slate-500">Zoom in to z{meta.minZoom}+ for counts</p>
      ) : (
        <ul className={isEmpty ? 'mt-2 space-y-1 opacity-50' : 'mt-2 space-y-1'}>
          {styleDefinition.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2 text-xs text-slate-600">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1 truncate">{category.label}</span>
              <span className="w-10 shrink-0 text-right font-medium text-slate-700 tabular-nums">
                {counts[category.id]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
