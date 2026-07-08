import { useQuery } from '@tanstack/react-query'
import type { NormalizedPhoto } from '@/features/providers/model'
import { buildStreetsidePreviewUrl } from '@/features/viewer/streetsidePreview'

const MAPILLARY_TOKEN = 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf'

type MapillaryThumbResponse = {
  thumb_1024_url?: string
}

type PanoramaxItemResponse = {
  assets?: {
    sd?: { href?: string }
    hd?: { href?: string }
  }
}

type MapilioSequenceItem = {
  id?: number | string
  filename?: string
  uploaded_hash?: string
}

// The API returns `{ data: [...] }`; iD's docs suggested `{ data: { data: [...] } }` — accept both.
type MapilioSequenceResponse = {
  data?: MapilioSequenceItem[] | { data?: MapilioSequenceItem[] }
}

export const fetchMapillaryThumbnail = async (photoId: string): Promise<string | null> => {
  const url = new URL(`https://graph.mapillary.com/${photoId}`)
  url.searchParams.set('fields', 'thumb_1024_url')
  url.searchParams.set('access_token', MAPILLARY_TOKEN)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Mapillary thumbnail failed (${response.status})`)
  }

  const data = (await response.json()) as MapillaryThumbResponse
  return data.thumb_1024_url ?? null
}

export const fetchPanoramaxThumbnail = async (
  sequenceId: string,
  photoId: string,
): Promise<string | null> => {
  const response = await fetch(
    `https://api.panoramax.xyz/api/collections/${encodeURIComponent(sequenceId)}/items/${encodeURIComponent(photoId)}`,
  )
  if (!response.ok) {
    throw new Error(`Panoramax thumbnail failed (${response.status})`)
  }

  const data = (await response.json()) as PanoramaxItemResponse
  return data.assets?.sd?.href ?? data.assets?.hd?.href ?? null
}

export const fetchMapilioThumbnail = async (
  sequenceId: string,
  photoId: string,
): Promise<string | null> => {
  const response = await fetch(
    `https://end.mapilio.com/api/sequence-detail?sequence_uuid=${encodeURIComponent(sequenceId)}`,
  )
  if (!response.ok) {
    throw new Error(`Mapilio sequence detail failed (${response.status})`)
  }

  const data = (await response.json()) as MapilioSequenceResponse
  const items = Array.isArray(data.data) ? data.data : (data.data?.data ?? [])
  const match = items.find((item) => String(item.id) === photoId)
  if (!match?.uploaded_hash || !match.filename) {
    return null
  }

  return `https://cdn.mapilio.com/im/${match.uploaded_hash}/${match.filename}/1080`
}

export const resolvePhotoThumbnailUrl = async (photo: NormalizedPhoto): Promise<string | null> => {
  if (photo.thumbUrl) {
    if (photo.providerId === 'streetside') {
      return buildStreetsidePreviewUrl(photo.thumbUrl)
    }
    return photo.thumbUrl
  }

  switch (photo.providerId) {
    case 'mapillary':
      return fetchMapillaryThumbnail(photo.photoId)
    case 'panoramax':
      if (!photo.sequenceId) {
        return null
      }
      return fetchPanoramaxThumbnail(photo.sequenceId, photo.photoId)
    case 'mapilio':
      if (!photo.sequenceId) {
        return null
      }
      return fetchMapilioThumbnail(photo.sequenceId, photo.photoId)
    // These providers deliver thumbUrl with the photo data; without it there is no fallback fetch.
    case 'kartaview':
    case 'streetside':
    case 'vegbilder':
      return null
    case 'mapillary-map-features': {
      throw new Error('Not implemented yet: "mapillary-map-features" case')
    }
    case 'mapillary-signs': {
      throw new Error('Not implemented yet: "mapillary-signs" case')
    }
    default:
      return null
  }
}

export const photoThumbnailQueryKey = (photo: NormalizedPhoto) =>
  ['photo-thumbnail', photo.providerId, photo.sequenceId, photo.photoId] as const

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
