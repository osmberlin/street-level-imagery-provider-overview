import {
  dayLabels,
  type MapFeatureImages,
  type NormalizedMapFeature,
  type NormalizedPhoto,
  type TargetImage,
} from '@osm-editor-kit/street-imagery'
import { useMapillaryMapFeatureImages } from '@osm-editor-kit/street-imagery-react'
import { useState } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { APP_START_NOW } from '@/features/styles/ageBuckets'
import { useFeatureTarget, useFeatureTargetActions } from '@/features/viewer/featureTargetStore'
import { useViewpointPhotos } from '@/features/viewer/useViewpointPhotos'

const toPhoto = (image: TargetImage): NormalizedPhoto => ({
  providerId: 'mapillary',
  photoId: image.id,
  sequenceId: null,
  capturedAt: image.capturedAt,
  isPano: image.isPano,
  heading: null,
  lngLat: image.lngLat,
})

/**
 * The photos that show a Mapillary map feature: one button per capture day, newest first.
 * A click opens that day's best photo, turned towards the feature; clicking the shown day again
 * steps through its photos.
 */
export const MapFeaturePhotos = ({ feature }: { feature: NormalizedMapFeature }) => {
  const [open, setOpen] = useState(false)
  const { search } = useAppSearchNavigation()
  const { data, isLoading, isError } = useMapillaryMapFeatureImages(open ? feature.featureId : null)
  const target = useFeatureTarget()
  const { setTarget } = useFeatureTargetActions()
  const { showPhoto } = useViewpointPhotos()
  const shownId = search.selected?.photoId

  const show = (images: MapFeatureImages, image: TargetImage) => {
    setTarget(images)
    showPhoto(toPhoto(image))
  }

  if (!open) {
    return (
      <button
        className="mt-3 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
        onClick={() => setOpen(true)}
        type="button"
      >
        Show photos of this feature
      </button>
    )
  }

  if (isLoading) {
    return <p className="mt-3 text-xs text-slate-500">Loading photos…</p>
  }
  if (isError || !data) {
    return <p className="mt-3 text-xs text-slate-500">Could not load photos of this feature.</p>
  }
  if (data.days.length === 0) {
    return (
      <p className="mt-3 text-xs text-slate-500">Mapillary lists no photos for this feature.</p>
    )
  }

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs text-slate-500">
        {data.images.length} photos on {data.days.length} days
        {data.feature.facing != null ? ` · faces ${Math.round(data.feature.facing)}°` : ''}
      </p>
      <div className="flex flex-wrap gap-1">
        {data.days.map((day) => {
          const labels = dayLabels(day.day, APP_START_NOW, 'en')
          const shownIndex = day.images.findIndex((image) => image.id === shownId)
          const active = target?.feature.id === data.feature.id && shownIndex >= 0
          return (
            <button
              aria-pressed={active}
              className={`rounded-md border px-2 py-1 text-left text-xs leading-tight ${active ? 'border-amber-500 bg-amber-100 text-amber-950' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
              key={day.day}
              onClick={() => {
                // The shown day again: step to its next photo.
                const next = active ? day.images[(shownIndex + 1) % day.images.length] : day.best
                if (next) {
                  show(data, next)
                }
              }}
              title={`${day.day}: ${day.images.length} photo${day.images.length === 1 ? '' : 's'}`}
              type="button"
            >
              <span className="block font-medium">{labels.month}</span>
              <span className="block text-slate-500">
                {labels.age} · {active ? `${shownIndex + 1}/` : ''}
                {day.images.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
