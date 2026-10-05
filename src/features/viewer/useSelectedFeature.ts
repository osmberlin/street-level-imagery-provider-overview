import { parseIsoDateStartMs } from '@osm-editor-kit/street-imagery'
import { useSelectedMapillaryFeature } from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'

/**
 * The selected Mapillary map feature (`feature` in the URL) with all photos that show it, the
 * photo of it that is shown, and the photo to open first: the newest day's best one, from within
 * the date filter if there is one.
 */
export const useSelectedFeature = () => {
  const { search } = useAppSearchNavigation()
  const featureId = search.feature ?? null
  const selected = useSelectedMapillaryFeature({
    featureId,
    shownPhotoId: search.selected?.photoId,
    minCapturedAt: search.date.from ? parseIsoDateStartMs(search.date.from) : null,
  })
  return { featureId, ...selected }
}
