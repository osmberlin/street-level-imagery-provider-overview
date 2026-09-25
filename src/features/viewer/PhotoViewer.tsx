import type { NormalizedPhoto } from '@osm-editor-kit/street-imagery'
import { providerById } from '@osm-editor-kit/street-imagery'
import { usePhotoThumbnail } from '@osm-editor-kit/street-imagery-react'
import { PhotoMetadata } from '@/features/viewer/PhotoMetadata'

type PhotoViewerProps = {
  photo: NormalizedPhoto
}

export const PhotoStaticPreview = ({ photo }: PhotoViewerProps) => {
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
              {photo.providerId === 'streetview'
                ? 'Google Street View imagery cannot be shown in-app — open Google Maps for the full panorama.'
                : 'Streetside cubemap tiles need provider stitching — open Bing Maps for the full panorama.'}
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
