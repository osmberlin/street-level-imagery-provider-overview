import {
  photoMatchesDateRange,
  viewpointFromPoint,
  type NormalizedPhoto,
  type ViewSuggestion,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  useActiveDirectionKey,
  useViewpoints,
  useViewSuggestions,
  type ViewpointHistoryEntry,
} from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'

/**
 * Viewpoints of the current click (from the session, or the `clicked` URL point after a reload),
 * their ranked Mapillary suggestions, and navigation that keeps session history and URL in sync.
 */
export const useViewpointPhotos = () => {
  const { search, updateSelected, updateSearch } = useAppSearchNavigation()
  const { clicked, providers, photoTypes, date, feature, selected } = search
  const sessionViewpoints = useViewpoints()
  const activeDirectionKey = useActiveDirectionKey()

  // Suggested views come from Mapillary only, and only while the map's "Street views" toggle is
  // on; otherwise clicks just select photos and features.
  const viewpointsEnabled = providers.includes('mapillary') && search.streetViews === 'on'
  // A selected map feature shows its own photos; views around the click would only distract.
  const viewpoints =
    !viewpointsEnabled || feature
      ? []
      : sessionViewpoints.length > 0
        ? sessionViewpoints
        : // No session (reload, or a photo pin was clicked): only a bare click point without
          // a photo gets views; a shown photo stays as it is.
          clicked && !selected
          ? [viewpointFromPoint([clicked.lng, clicked.lat])]
          : []

  const { suggestions, isLoading, isError } = useViewSuggestions(viewpoints, {
    photoTypes,
    filterPhoto: (photo) => photoMatchesDateRange(photo, date),
    enabled: viewpointsEnabled,
  })

  const writeUrl = ({ photo }: ViewpointHistoryEntry) =>
    updateSelected({
      provider: photo.providerId,
      sequenceId: photo.sequenceId ?? undefined,
      photoId: photo.photoId,
    })

  const showPhoto = (photo: NormalizedPhoto, directionKey: string | null = null) => {
    const entry = { photo, directionKey }
    getViewpointSession().actions.showPhoto(entry)
    writeUrl(entry)
  }

  const selectSuggestion = (suggestion: ViewSuggestion) => {
    const best = suggestion.candidates[0]
    if (best) {
      showPhoto(best.photo, suggestion.direction.key)
    }
  }

  const back = () => {
    const entry = getViewpointSession().actions.back()
    if (entry) {
      writeUrl(entry)
    }
  }

  const forward = () => {
    const entry = getViewpointSession().actions.forward()
    if (entry) {
      writeUrl(entry)
    }
  }

  // Closing the panel ends the session: back/forward start empty next time.
  const close = () => {
    getViewpointSession().actions.reset()
    updateSearch({ clicked: undefined, selected: undefined, feature: undefined }, { replace: true })
  }

  return {
    viewpointsEnabled,
    viewpoints,
    suggestions,
    suggestionsLoading: isLoading,
    suggestionsError: isError,
    activeDirectionKey,
    showPhoto,
    selectSuggestion,
    back,
    forward,
    close,
  }
}
