import {
  dayLabels,
  mapillaryIconUrl,
  type MapFeatureImages,
  type TargetImage,
} from '@osm-editor-kit/street-imagery'
import { APP_START_NOW } from '@/features/styles/ageBuckets'
import { formatFeatureDate, humanizeFeatureValue } from '@/features/viewer/mapFeatureDisplay'

type FeatureBarProps = {
  data: MapFeatureImages
  shownImage: TargetImage | null
  onShow: (image: TargetImage) => void
}

/**
 * The selected sign or object above its photo: what it is, when Mapillary saw it, and one button
 * per capture day (newest first). The shown day is highlighted; clicking it again steps through
 * that day's photos.
 */
export const FeatureBar = ({ data, shownImage, onShow }: FeatureBarProps) => {
  const { feature, days, images } = data

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p
          className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-900"
          title={feature.value}
        >
          {/* Mapillary's icon for the value; not every value has one. */}
          <img
            alt=""
            className="size-6 shrink-0"
            key={feature.value}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            src={mapillaryIconUrl(feature.value)}
          />
          <span className="truncate">{humanizeFeatureValue(feature.value)}</span>
        </p>
        <p className="shrink-0 text-xs text-slate-500">
          seen {formatFeatureDate(feature.firstSeenAt)} – {formatFeatureDate(feature.lastSeenAt)}
        </p>
      </div>
      {days.length === 0 ? (
        <p className="text-xs text-slate-500">Mapillary lists no photos for this feature.</p>
      ) : (
        <div
          aria-label={`${images.length} photos on ${days.length} days`}
          className="flex gap-1 overflow-x-auto"
          role="group"
        >
          {days.map((day) => {
            const labels = dayLabels(day.day, APP_START_NOW, 'en')
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
                title={`${day.day}: ${day.images.length} photo${day.images.length === 1 ? '' : 's'}${active && day.images.length > 1 ? ' — click for the next one' : ''}`}
                type="button"
              >
                <span className="block font-medium">{labels.month}</span>
                <span className={`block ${active ? 'text-amber-800' : 'text-slate-500'}`}>
                  {labels.age} · {active ? `${shownIndex + 1}/` : ''}
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
