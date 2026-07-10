import { twMerge } from 'tailwind-merge'
import type { NormalizedPhoto } from '@/features/providers/model'
import { providerById } from '@/features/providers/registry'
import { providerExternalLink } from '@/features/viewer/externalLinks'

type PhotoMetadataProps = {
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

export const PhotoMetadata = ({ photo }: PhotoMetadataProps) => {
  const provider = providerById[photo.providerId]
  const externalLink = providerExternalLink(photo)

  return (
    <>
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
    </>
  )
}
