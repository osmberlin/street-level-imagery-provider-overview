import { twMerge } from 'tailwind-merge'
import type { NormalizedPhoto } from '@/features/providers/model'
import { providerById } from '@/features/providers/registry'
import { providerExternalLink } from '@/features/viewer/externalLinks'
import { usePhotoThumbnail } from '@/features/viewer/photoThumbnails'

type PhotoViewerProps = {
  photo: NormalizedPhoto
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

export const PhotoViewer = ({ photo }: PhotoViewerProps) => {
  const { data: thumbnailUrl, isLoading, isError } = usePhotoThumbnail(photo)
  const provider = providerById[photo.providerId]
  const externalLink = providerExternalLink(photo)
  const showMetadataOnly = photo.providerId === 'streetside' && !thumbnailUrl && !isLoading

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {isLoading ? (
          <div className="flex aspect-video items-center justify-center text-sm text-slate-500">
            Loading preview…
          </div>
        ) : thumbnailUrl ? (
          <img
            alt={`${provider.label} street-level photo`}
            className="aspect-video w-full object-cover"
            src={thumbnailUrl}
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
            <span>{isError ? 'Preview unavailable' : 'No preview for this provider'}</span>
            {showMetadataOnly ? (
              <span className="text-xs text-slate-400">
                Streetside cubemap tiles need provider stitching — open Bing Maps for the full
                panorama.
              </span>
            ) : null}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
        <dt className="text-slate-500">Captured</dt>
        <dd>{formatCaptureDate(photo.capturedAt)}</dd>
        <dt className="text-slate-500">Type</dt>
        <dd>{photo.isPano === true ? 'Panorama' : photo.isPano === false ? 'Flat' : 'Unknown'}</dd>
        {photo.heading != null ? (
          <>
            <dt className="text-slate-500">Heading</dt>
            <dd>{Math.round(photo.heading)}°</dd>
          </>
        ) : null}
      </dl>

      <a
        className={twMerge(
          'inline-flex items-center gap-1 text-xs font-medium text-slate-700 underline-offset-2 hover:underline',
        )}
        href={externalLink}
        rel="noreferrer"
        target="_blank"
      >
        Open in {provider.label}
      </a>
    </div>
  )
}
