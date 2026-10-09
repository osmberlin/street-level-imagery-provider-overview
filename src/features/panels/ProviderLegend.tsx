import { mapFeatureMatchesDateRange, photoFilter } from '@osm-editor-kit/street-imagery'
import type { Bbox } from '@osm-editor-kit/street-imagery'
import { providerById, type ProviderId } from '@osm-editor-kit/street-imagery'
import { useProviderMapFeatures, useProviderPhotos } from '@osm-editor-kit/street-imagery-react'
import type { AppSearch } from '@/app/searchSchema'
import { countMapFeaturesByCategory } from '@/features/styles/countViewportMapFeatures'
import { countPhotosByCategory, totalPhotoCount } from '@/features/styles/countViewportPhotos'
import {
  getMapFeatureStyleDefinition,
  getStyleDefinition,
} from '@/features/styles/styleDefinitions'
import { useAppI18n } from '@/i18n/useAppI18n'

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
  const { t } = useAppI18n()
  const meta = providerById[providerId]
  const { data: photos = [] } = useProviderPhotos(providerId, bbox, zoom)
  const { data: mapFeatures = [] } = useProviderMapFeatures(providerId, bbox, zoom)

  const isMapFeature = meta.kind === 'mapFeature'
  const styleDefinition = isMapFeature
    ? getMapFeatureStyleDefinition(style)
    : getStyleDefinition(style)

  const filteredPhotos = photos.filter(photoFilter(photoTypes, date))
  const filteredMapFeatures = mapFeatures.filter((feature) =>
    mapFeatureMatchesDateRange(feature, date),
  )

  const counts = isMapFeature
    ? countMapFeaturesByCategory(filteredMapFeatures, style)
    : countPhotosByCategory(filteredPhotos, style)

  const total = totalPhotoCount(counts)
  const belowMinZoom = zoom < meta.minZoom
  const isEmpty = !belowMinZoom && total === 0

  if (belowMinZoom) {
    return null
  }

  return (
    <ul className={isEmpty ? 'space-y-1 opacity-50' : 'space-y-1'}>
      {styleDefinition.categories.map((category) => (
        <li key={category.id} className="flex items-center gap-2 text-xs text-slate-600">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="min-w-0 flex-1 truncate">
            {t.style.category[category.id] ?? category.label}
          </span>
          <span className="w-10 shrink-0 text-right font-medium text-slate-700 tabular-nums">
            {counts[category.id]}
          </span>
        </li>
      ))}
      <li className="flex items-center gap-2 border-t border-slate-200 pt-1 text-xs text-slate-600">
        <span className="min-w-0 flex-1 truncate">{t.providers.inView}</span>
        <span className="w-10 shrink-0 text-right font-medium text-slate-700 tabular-nums">
          {total}
        </span>
      </li>
    </ul>
  )
}
