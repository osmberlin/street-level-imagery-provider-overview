import { useQuery } from '@tanstack/react-query'
import type { NormalizedPhoto } from '@/street-imagery/providers/model'
import {
  photoFullUrlQueryKey,
  photoThumbnailQueryKey,
  resolvePhotoPanoramaUrl,
  resolvePhotoThumbnailUrl,
} from '@/street-imagery/viewer/photoThumbnails'

export const usePhotoFullUrl = (photo: NormalizedPhoto | null) =>
  useQuery({
    queryKey: photo ? photoFullUrlQueryKey(photo) : ['photo-full-url', 'none'],
    queryFn: () => {
      if (!photo) {
        return null
      }
      return resolvePhotoPanoramaUrl(photo)
    },
    enabled: photo != null,
    staleTime: 24 * 60 * 60 * 1000,
  })

export const usePhotoThumbnail = (photo: NormalizedPhoto | null) =>
  useQuery({
    queryKey: photo ? photoThumbnailQueryKey(photo) : ['photo-thumbnail', 'none'],
    queryFn: () => {
      if (!photo) {
        return null
      }
      return resolvePhotoThumbnailUrl(photo)
    },
    enabled: photo != null,
    staleTime: 24 * 60 * 60 * 1000,
  })
