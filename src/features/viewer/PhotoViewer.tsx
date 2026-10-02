import type { NormalizedPhoto } from '@osm-editor-kit/street-imagery'
import { providerById } from '@osm-editor-kit/street-imagery'
import { usePhotoThumbnail } from '@osm-editor-kit/street-imagery-react'
import { useAppI18n } from '@/i18n/useAppI18n'

type PhotoViewerProps = {
  photo: NormalizedPhoto
}

export const PhotoStaticPreview = ({ photo }: PhotoViewerProps) => {
  const { t } = useAppI18n()
  const { data: thumbnailUrl, isLoading, isError } = usePhotoThumbnail(photo)
  const provider = providerById[photo.providerId]
  const showMetadataOnly =
    (photo.providerId === 'streetside' || photo.providerId === 'streetview') &&
    !thumbnailUrl &&
    !isLoading

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {isLoading ? (
        <div className="flex aspect-video items-center justify-center text-sm text-slate-500">
          {t.viewer.loadingPreview}
        </div>
      ) : thumbnailUrl ? (
        <img
          alt={`${provider.label}: ${t.viewer.photoAlt}`}
          className="aspect-video w-full object-cover"
          src={thumbnailUrl}
        />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
          <span>{isError ? t.viewer.previewUnavailable : t.viewer.noPreview}</span>
          {showMetadataOnly ? (
            <span className="text-xs text-slate-400">
              {photo.providerId === 'streetview'
                ? t.viewer.streetViewNotInApp
                : t.viewer.streetsideNotInApp}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
