import {
  bestTargetImage,
  parseIsoDateStartMs,
  type NormalizedPhoto,
  type TargetImage,
} from '@osm-editor-kit/street-imagery'
import { useMapillaryMapFeatureImages } from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'

export const targetImageToPhoto = (image: TargetImage): NormalizedPhoto => ({
  providerId: 'mapillary',
  photoId: image.id,
  sequenceId: null,
  capturedAt: image.capturedAt,
  isPano: image.isPano,
  heading: null,
  lngLat: image.lngLat,
  ...(image.originalLngLat ? { originalLngLat: image.originalLngLat } : {}),
})

/**
 * The selected Mapillary map feature (`feature` in the URL) with all photos that show it, the
 * photo of it that is shown, and the photo to open first: the newest day's best one, from within
 * the date filter if there is one.
 */
export const useSelectedFeature = () => {
  const { search } = useAppSearchNavigation()
  const featureId = search.feature ?? null
  const { data, isLoading, isError } = useMapillaryMapFeatureImages(featureId)

  const shownImage = data?.images.find((image) => image.id === search.selected?.photoId) ?? null
  const fromMs = search.date.from ? parseIsoDateStartMs(search.date.from) : null
  const firstImage = data
    ? (bestTargetImage(data.images, data.feature.lngLat, { minCapturedAt: fromMs ?? undefined }) ??
      null)
    : null

  return { featureId, data: data ?? null, isLoading, isError, shownImage, firstImage }
}
