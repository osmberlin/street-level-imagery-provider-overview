import { twMerge } from 'tailwind-merge'
import type { AppSearch } from '@/app/searchSchema'
import { providerById } from '@/features/providers/registry'
import type { PhotoSequenceGroup } from '@/features/viewer/groupClickedPhotos'
import { findPhotoIndexInGroup } from '@/features/viewer/groupClickedPhotos'
import { PhotoViewer } from '@/features/viewer/PhotoViewer'

type SequenceGroupCardProps = {
  group: PhotoSequenceGroup
  selected: AppSearch['selected']
  onSelectGroup: (group: PhotoSequenceGroup) => void
  onStepPhoto: (photoId: string) => void
}

const formatCaptureDate = (capturedAt: number | null): string => {
  if (capturedAt == null) {
    return 'Unknown date'
  }
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(capturedAt)
}

const groupCaptureLabel = (group: PhotoSequenceGroup): string => {
  const timestamps = group.photos
    .map((photo) => photo.capturedAt)
    .filter((value): value is number => value != null)
  if (timestamps.length === 0) {
    return 'Unknown date'
  }
  const earliest = Math.min(...timestamps)
  const latest = Math.max(...timestamps)
  if (earliest === latest) {
    return formatCaptureDate(earliest)
  }
  return `${formatCaptureDate(earliest)} – ${formatCaptureDate(latest)}`
}

const panoLabel = (group: PhotoSequenceGroup): string => {
  const panoCount = group.photos.filter((photo) => photo.isPano === true).length
  const flatCount = group.photos.filter((photo) => photo.isPano === false).length
  if (panoCount > 0 && flatCount === 0) {
    return 'Panorama'
  }
  if (flatCount > 0 && panoCount === 0) {
    return 'Flat'
  }
  if (panoCount > 0 && flatCount > 0) {
    return 'Mixed'
  }
  return 'Unknown type'
}

export const SequenceGroupCard = ({
  group,
  selected,
  onSelectGroup,
  onStepPhoto,
}: SequenceGroupCardProps) => {
  const provider = providerById[group.providerId]
  const isActive =
    selected?.provider === group.providerId && selected.sequenceId === group.sequenceId

  const activePhoto =
    isActive && selected
      ? (group.photos.find((photo) => photo.photoId === selected.photoId) ?? group.photos[0])
      : null

  const activeIndex =
    activePhoto && selected?.photoId ? findPhotoIndexInGroup(group, selected.photoId) : -1
  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex >= 0 && activeIndex < group.photos.length - 1

  return (
    <article
      className={twMerge(
        'rounded-xl border transition-colors',
        isActive
          ? 'border-slate-400 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        type="button"
        onClick={() => {
          onSelectGroup(group)
        }}
      >
        <span
          aria-hidden
          className="mt-1 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: provider.color }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{provider.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {panoLabel(group)}
            </span>
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {groupCaptureLabel(group)} · {group.photos.length}{' '}
            {group.photos.length === 1 ? 'photo' : 'photos'} · {Math.round(group.distanceMeters)} m
            away
          </span>
        </span>
      </button>

      {isActive && activePhoto ? (
        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
          <PhotoViewer photo={activePhoto} />

          {group.photos.length > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoPrev}
                type="button"
                onClick={() => {
                  const previous = group.photos[activeIndex - 1]
                  if (previous) {
                    onStepPhoto(previous.photoId)
                  }
                }}
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                {activeIndex + 1} / {group.photos.length}
              </span>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoNext}
                type="button"
                onClick={() => {
                  const next = group.photos[activeIndex + 1]
                  if (next) {
                    onStepPhoto(next.photoId)
                  }
                }}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
