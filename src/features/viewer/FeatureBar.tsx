import {
  dayLabels,
  mapillaryIconUrl,
  type MapFeatureImages,
  type TargetImage,
} from '@osm-editor-kit/street-imagery'
import { APP_START_NOW } from '@/features/styles/ageBuckets'
import { humanizeFeatureValue } from '@/features/viewer/mapFeatureDisplay'

/**
 * Every text of the bar. Plain functions, so a host app can pass its own language from a constant
 * or from its i18n library (e.g. react-intl's `formatMessage`).
 */
export type FeatureBarLabels = {
  /** Name of a Mapillary value like `regulatory--turn-right-ahead--g1`. */
  featureName: (value: string) => string
  seen: (first: string, last: string) => string
  unknownDate: string
  noPhotos: string
  daysSummary: (photos: number, days: number) => string
  dayTitle: (day: string, photos: number, canStep: boolean) => string
}

export const FEATURE_BAR_LABELS_EN: FeatureBarLabels = {
  featureName: humanizeFeatureValue,
  seen: (first, last) => (first === last ? `Seen ${first}` : `Seen ${first} – ${last}`),
  unknownDate: 'unknown',
  noPhotos: 'Mapillary lists no photos for this feature.',
  daysSummary: (photos, days) => `${photos} photos on ${days} days`,
  dayTitle: (day, photos, canStep) =>
    `${day}: ${photos} photo${photos === 1 ? '' : 's'}${canStep ? ' — click for the next one' : ''}`,
}

type FeatureBarProps = {
  data: MapFeatureImages
  shownImage: TargetImage | null
  onShow: (image: TargetImage) => void
  /** BCP 47 locale for dates and ages. */
  locale?: string
  labels?: FeatureBarLabels
}

/**
 * The selected sign or object above its photo: what it is, when Mapillary saw it, and one button
 * per capture day (newest first). The shown day is highlighted; clicking it again steps through
 * that day's photos.
 */
export const FeatureBar = ({
  data,
  shownImage,
  onShow,
  locale = 'en',
  labels = FEATURE_BAR_LABELS_EN,
}: FeatureBarProps) => {
  const { feature, days, images } = data
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
  const formatDate = (timestamp: number | null) =>
    timestamp == null ? labels.unknownDate : dateFormat.format(timestamp)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5" title={feature.value}>
        {/* Mapillary's icon for the value; not every value has one. */}
        <img
          alt=""
          className="size-7 shrink-0"
          key={feature.value}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          src={mapillaryIconUrl(feature.value)}
        />
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-medium text-slate-900">
            {labels.featureName(feature.value)}
          </p>
          <p className="truncate text-xs leading-tight text-slate-500">
            {labels.seen(formatDate(feature.firstSeenAt), formatDate(feature.lastSeenAt))}
          </p>
        </div>
      </div>
      {days.length === 0 ? (
        <p className="text-xs text-slate-500">{labels.noPhotos}</p>
      ) : (
        <div
          aria-label={labels.daysSummary(images.length, days.length)}
          className="flex gap-1 overflow-x-auto"
          role="group"
        >
          {days.map((day) => {
            const dayLabel = dayLabels(day.day, APP_START_NOW, locale)
            const shownIndex = shownImage
              ? day.images.findIndex((image) => image.id === shownImage.id)
              : -1
            const active = shownIndex >= 0
            return (
              <button
                aria-pressed={active}
                className={`shrink-0 rounded-md border px-2 py-0.5 text-left text-xs leading-tight ${active ? 'border-amber-500 bg-amber-100 text-amber-950' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
                key={day.day}
                onClick={() => {
                  // The shown day again: step to its next photo.
                  const next = active ? day.images[(shownIndex + 1) % day.images.length] : day.best
                  if (next) {
                    onShow(next)
                  }
                }}
                title={labels.dayTitle(day.day, day.images.length, active && day.images.length > 1)}
                type="button"
              >
                <span className="block font-medium">{dayLabel.month}</span>
                <span className={`block ${active ? 'text-amber-800' : 'text-slate-500'}`}>
                  {dayLabel.age} · {active ? `${shownIndex + 1}/` : ''}
                  {day.images.length}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
