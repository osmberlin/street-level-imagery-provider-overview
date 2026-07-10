import type { NormalizedPhoto } from '@/features/providers/model'
import { providerById } from '@/features/providers/registry'
import { PhotoMetadata } from '@/features/viewer/PhotoMetadata'
import { usePhotoThumbnail } from '@/features/viewer/photoThumbnails'

type PhotoViewerProps = {
  photo: NormalizedPhoto
}

export const PhotoStaticPreview = ({ photo }: PhotoViewerProps) => {
  const { data: thumbnailUrl, isLoading, isError } = usePhotoThumbnail(photo)
  const provider = providerById[photo.providerId]
  const showMetadataOnly = photo.providerId === 'streetside' && !thumbnailUrl && !isLoading

  return (
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
  )
}

export const PhotoViewer = ({ photo }: PhotoViewerProps) => {
  return (
    <div className="space-y-3">
      <PhotoStaticPreview photo={photo} />
      <PhotoMetadata photo={photo} />
    </div>
  )
}
