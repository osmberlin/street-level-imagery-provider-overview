import {
  angleDiffDeg,
  distanceMeters,
  lineLengthMeters,
  photoMatchesFilters,
  snapToLine,
  type LngLat,
  type NormalizedPhoto,
  type ViewSuggestion,
} from '@osm-editor-kit/street-imagery'
import {
  useAllProviderPhotos,
  useMapViewportBbox,
  useViewpointLine,
} from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'

/** Photos this close to the clicked street count as "on" it. */
const MAX_OFFSET_METERS = 12
/** Flat photos must look roughly along the wanted direction. */
const MAX_HEADING_DIFF_DEG = 60
/** Skip photos (almost) at the same spot as the shown one. */
const MIN_STEP_METERS = 2

/** Meters from the line's start to the point on it nearest to `point`, with the offset. */
const positionOnLine = (line: LngLat[], point: LngLat) => {
  const snapped = snapToLine(line, point)
  if (!snapped) {
    return null
  }
  const before = line.slice(0, snapped.segmentIndex + 1)
  return {
    along:
      lineLengthMeters(before) + distanceMeters(before[before.length - 1] as LngLat, snapped.point),
    offset: distanceMeters(snapped.point, point),
    bearing: snapped.bearing,
  }
}

/**
 * Previous / next Mapillary photo along the clicked street, from the shown photo: the nearest
 * photo further along the line that looks the same way as the active suggested view (forward or
 * back along the street). `null` when no street is selected.
 */
export const useStepAlongLine = (
  photo: NormalizedPhoto | null,
  activeSuggestion: ViewSuggestion | undefined,
) => {
  const line = useViewpointLine()
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID)
  const { photos } = useAllProviderPhotos(
    ['mapillary'],
    line ? bbox : null,
    map.zoom,
    search.photoTypes,
    search.date,
  )

  if (!line || line.length < 2 || !photo) {
    return null
  }
  const current = positionOnLine(line, photo.lngLat)
  if (!current) {
    return null
  }
  // Looking back along the street means the wanted heading is the reverse of the line.
  const lookingBack = activeSuggestion?.direction.kind === 'back'

  const onLine = photos.flatMap((candidate) => {
    if (candidate.photoId === photo.photoId) {
      return []
    }
    if (!photoMatchesFilters(candidate, search.photoTypes, search.date)) {
      return []
    }
    const position = positionOnLine(line, candidate.lngLat)
    if (!position || position.offset > MAX_OFFSET_METERS) {
      return []
    }
    if (candidate.isPano !== true) {
      const wanted = position.bearing + (lookingBack ? 180 : 0)
      if (
        candidate.heading == null ||
        angleDiffDeg(candidate.heading, wanted) > MAX_HEADING_DIFF_DEG
      ) {
        return []
      }
    }
    return [{ photo: candidate, along: position.along }]
  })

  const ahead = onLine
    .filter((candidate) => candidate.along > current.along + MIN_STEP_METERS)
    .sort((a, b) => a.along - b.along)[0]
  const behind = onLine
    .filter((candidate) => candidate.along < current.along - MIN_STEP_METERS)
    .sort((a, b) => b.along - a.along)[0]

  // "Next" is the way you look: along the street, or back along it.
  return {
    next: (lookingBack ? behind : ahead)?.photo ?? null,
    previous: (lookingBack ? ahead : behind)?.photo ?? null,
  }
}
