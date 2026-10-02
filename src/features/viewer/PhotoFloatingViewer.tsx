import {
  findGroupBySelection,
  findNearestPhoto,
  providerById,
  providerExternalLink,
  type NormalizedPhoto,
} from '@osm-editor-kit/street-imagery'
import {
  FloatingPhotoViewer,
  FloatingViewerInfoButton,
  MapillaryFeatureBar,
  PhotoDate,
  getViewpointSession,
  useCanGoBack,
  useCanGoForward,
  useCurrentHistoryEntry,
  useStreetImageryI18n,
} from '@osm-editor-kit/street-imagery-react'
import {
  PHOTO_DETAILS_LABELS,
  PhotoDetailsDialog,
} from '@osm-editor-kit/street-imagery-react/photo-details'
import { useEffect, useRef, useState } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { isProviderId } from '@/app/searchSchema'
import { LookAroundLinkCard } from '@/features/viewer/LookAroundLinkCard'
import { ViewerPanelSwitch } from '@/features/viewer/panels/ViewerPanelSwitch'
import { useClickedPhotos } from '@/features/viewer/useClickedPhotos'
import { targetImageToPhoto, useSelectedFeature } from '@/features/viewer/useSelectedFeature'
import { useSelectedPhotoForMap } from '@/features/viewer/useSelectedPhotoForMap'
import { useStepAlongLine } from '@/features/viewer/useStepAlongLine'
import { useViewpointPhotos } from '@/features/viewer/useViewpointPhotos'
import { useAppI18n } from '@/i18n/useAppI18n'

/** Light dot between the parts of the photo info line. */
const separator = (
  <span aria-hidden className="px-1.5 text-slate-300">
    ·
  </span>
)

const samePhoto = (a: NormalizedPhoto | null | undefined, b: NormalizedPhoto | null | undefined) =>
  a != null && b != null && a.providerId === b.providerId && a.photoId === b.photoId

/**
 * The one floating panel over the map. It shows a photo in its provider viewer, and above it
 * either the suggested views of the clicked spot or street (Mapillary), or the selected map
 * feature (sign, object) with its capture days. Plus history.
 */
export const PhotoFloatingViewer = () => {
  const { search } = useAppSearchNavigation()
  const { clicked, selected, providers } = search
  const { locale, t } = useAppI18n()
  const { messages } = useStreetImageryI18n()
  // The viewers' own attribution and legend are hidden; the footer shows creator, licence and the
  // other details instead. The viewer knows more about a photo than the map tiles do.
  const [viewerPhoto, setViewerPhoto] = useState<NormalizedPhoto | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const {
    viewpoints,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    activeDirectionKey,
    showPhoto,
    selectSuggestion,
    back,
    forward,
    close,
  } = useViewpointPhotos()
  const currentEntry = useCurrentHistoryEntry()
  const canGoBack = useCanGoBack()
  const canGoForward = useCanGoForward()
  const { groups, isLoading, isFetching, gsvStatus } = useClickedPhotos()
  const { selectedPhoto } = useSelectedPhotoForMap()
  const selectedFeature = useSelectedFeature()
  const featureData = selectedFeature.data

  // The URL holds the selected photo; history entries carry full data for photos off the map.
  const urlPhoto: NormalizedPhoto | null =
    selected?.photoId && isProviderId(selected.provider)
      ? (selectedPhoto ??
        (currentEntry?.photo.photoId === selected.photoId ? currentEntry.photo : null))
      : null

  useEffect(
    function recordUrlSelectionInHistory() {
      if (urlPhoto && !samePhoto(urlPhoto, getViewpointSession().current?.photo)) {
        getViewpointSession().actions.showPhoto({ photo: urlPhoto, directionKey: null })
      }
    },
    [urlPhoto],
  )

  // Auto-select once per click: the best suggested view, else the nearest photo of any provider.
  const autoSelectKey = clicked
    ? `${clicked.lng},${clicked.lat}|${viewpoints.map((v) => v.id).join(',')}`
    : null
  const autoSelectedRef = useRef<string | null>(null)
  const photosSettled = !suggestionsLoading && !isLoading && !isFetching
  useEffect(
    function autoSelectBestPhoto() {
      // A selected map feature opens its own best photo (below).
      if (!autoSelectKey || selected || !photosSettled || selectedFeature.featureId) {
        return
      }
      if (autoSelectedRef.current === autoSelectKey) {
        return
      }
      autoSelectedRef.current = autoSelectKey
      const bestSuggestion = suggestions.find((suggestion) => suggestion.candidates.length > 0)
      if (bestSuggestion) {
        selectSuggestion(bestSuggestion)
        return
      }
      const nearestGroup = groups[0]
      const nearest =
        nearestGroup && clicked
          ? findNearestPhoto(nearestGroup.photos, clicked.lng, clicked.lat)
          : null
      if (nearest) {
        showPhoto(nearest)
      }
    },
    [
      autoSelectKey,
      clicked,
      groups,
      photosSettled,
      selectSuggestion,
      selected,
      selectedFeature.featureId,
      showPhoto,
      suggestions,
    ],
  )

  // A newly selected feature opens the newest day's best photo of it, once.
  const { firstImage } = selectedFeature
  const featureOpenedRef = useRef<string | null>(null)
  useEffect(
    function openBestPhotoOfFeature() {
      const featureId = selectedFeature.featureId
      if (!featureId) {
        featureOpenedRef.current = null
        return
      }
      if (!firstImage || featureOpenedRef.current === featureId) {
        return
      }
      featureOpenedRef.current = featureId
      if (!selectedFeature.shownImage) {
        showPhoto(targetImageToPhoto(firstImage))
      }
    },
    [firstImage, selectedFeature.featureId, selectedFeature.shownImage, showPhoto],
  )

  const activeSuggestion = suggestions.find((s) => s.direction.key === activeDirectionKey)
  const lineSteps = useStepAlongLine(urlPhoto, activeSuggestion)

  if (!clicked && !urlPhoto && !selectedFeature.featureId) {
    return null
  }

  const photo = urlPhoto
  const provider = photo ? providerById[photo.providerId] : null
  const activeGroup = photo
    ? findGroupBySelection(groups, photo.providerId, photo.sequenceId ?? `photo:${photo.photoId}`)
    : null

  // A photo opened from a suggested view looks in that view's direction (360° photos turn).
  const lookAtBearing =
    currentEntry && samePhoto(currentEntry.photo, photo)
      ? (suggestions.find((s) => s.direction.key === currentEntry.directionKey)?.direction
          .bearing ?? null)
      : null
  // A photo of the selected map feature turns to the feature and outlines it.
  const lookAt =
    featureData && selectedFeature.shownImage
      ? {
          lngLat: featureData.feature.lngLat,
          outline: selectedFeature.shownImage.outline,
          value: featureData.feature.value,
          label: messages.feature.name(featureData.feature.value),
        }
      : null
  const previousOnLine = lineSteps?.previous ?? null
  const nextOnLine = lineSteps?.next ?? null
  const showLookAround = providers.includes('lookaround') && clicked != null
  const loading = suggestionsLoading || isLoading || isFetching
  const suggestionsFound = suggestions.some((suggestion) => suggestion.candidates.length > 0)
  const status = (() => {
    if (selectedFeature.featureId) {
      if (selectedFeature.isLoading) {
        return t.viewer.loadingFeature
      }
      return selectedFeature.isError ? t.viewer.featureError : null
    }
    if (loading && !photo) {
      return t.viewer.lookingForPhotos
    }
    if (suggestionsError) {
      return t.viewer.suggestionsError
    }
    if (!photo && groups.length === 0 && !showLookAround) {
      if (gsvStatus === 'no-key' && providers.length === 1) {
        return t.viewer.noStreetViewKey
      }
      return t.viewer.noPhotos
    }
    if (suggestions.length > 0 && !suggestionsFound && !loading) {
      return t.viewer.noSuggestedPhotos
    }
    return null
  })()

  // Details of the shown photo, once its viewer has loaded it.
  const shown = photo && viewerPhoto?.photoId === photo.photoId ? viewerPhoto : null
  const details = shown?.details
  const creatorName = shown?.creatorName
  // Mapillary's licence is the same for every image; Panoramax states it per photo.
  const license =
    details?.license ?? (photo?.providerId === 'mapillary' && shown ? t.viewer.license : null)
  const typeTooltip =
    [
      details?.camera,
      details?.fieldOfViewDeg != null ? t.viewer.fieldOfView(details.fieldOfViewDeg) : null,
      details?.positionAccuracyMeters != null
        ? t.viewer.positionAccuracy(details.positionAccuracyMeters)
        : null,
      details?.instance ? t.viewer.instance(details.instance) : null,
    ]
      .filter(Boolean)
      .join('\n') || undefined

  return (
    <>
      {shown ? (
        <PhotoDetailsDialog
          externalUrl={providerExternalLink(shown)}
          open={detailsOpen}
          photo={shown}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
      <FloatingPhotoViewer
        titleActions={
          shown ? (
            <FloatingViewerInfoButton
              label={PHOTO_DETAILS_LABELS[locale].open}
              onClick={() => setDetailsOpen(true)}
            />
          ) : undefined
        }
        activeDirectionKey={activeDirectionKey}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        footer={
          photo && provider ? (
            <div className="flex items-center gap-3 text-[11px]">
              <p className="min-w-0 flex-1 truncate">
                <PhotoDate localDateTime={details?.capturedAtLocal} timestamp={photo.capturedAt} />
                {separator}
                <span title={typeTooltip}>
                  {photo.isPano
                    ? t.viewer.pano
                    : photo.isPano === false
                      ? t.viewer.flat
                      : t.viewer.unknownType}
                </span>
                {creatorName ? (
                  <>
                    {separator}
                    {photo.providerId === 'mapillary' ? (
                      <a
                        className="underline-offset-2 hover:underline"
                        href={`https://www.mapillary.com/app/user/${encodeURIComponent(creatorName)}?pKey=${encodeURIComponent(photo.photoId)}&focus=photo`}
                        rel="noreferrer"
                        target="_blank"
                        title={t.viewer.creatorProfile}
                      >
                        {creatorName}
                      </a>
                    ) : (
                      <span title={details?.creatorContact}>{creatorName}</span>
                    )}
                  </>
                ) : null}
                {license ? (
                  <>
                    {separator}
                    {details?.licenseUrl ? (
                      <a
                        className="underline-offset-2 hover:underline"
                        href={details.licenseUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {license}
                      </a>
                    ) : (
                      license
                    )}
                  </>
                ) : null}
              </p>
              <a
                className="shrink-0 text-slate-800 underline-offset-2 hover:underline"
                href={providerExternalLink(photo)}
                rel="noreferrer"
                target="_blank"
              >
                {t.opener.openIn(provider.label)}
              </a>
            </div>
          ) : undefined
        }
        onBack={back}
        onClose={close}
        onForward={forward}
        onSelectSuggestion={selectSuggestion}
        status={status}
        step={
          lineSteps
            ? {
                onPrevious: previousOnLine
                  ? () => showPhoto(previousOnLine, activeDirectionKey)
                  : undefined,
                onNext: nextOnLine ? () => showPhoto(nextOnLine, activeDirectionKey) : undefined,
                previousLabel: t.viewer.previousOnStreet,
                nextLabel: t.viewer.nextOnStreet,
              }
            : undefined
        }
        toolbar={
          featureData ? (
            <MapillaryFeatureBar
              data={featureData}
              onShow={(image) => showPhoto(targetImageToPhoto(image))}
              shownImage={selectedFeature.shownImage}
            />
          ) : undefined
        }
        suggestions={suggestions}
        title={
          featureData ? t.viewer.titleFeature : provider ? provider.label : t.viewer.titlePhotos
        }
      >
        {photo ? (
          <div className="px-2">
            <ViewerPanelSwitch
              groupPhotos={activeGroup?.photos ?? [photo]}
              lookAt={lookAt}
              lookAtBearing={lookAtBearing}
              onViewerPhoto={(loaded) => {
                setViewerPhoto(loaded)
                showPhoto(loaded)
              }}
              photo={photo}
            />
          </div>
        ) : showLookAround && clicked ? (
          // No photo here (e.g. Look Around only): the Look Around card is the content.
          <div className="px-2 pb-2">
            <LookAroundLinkCard lat={clicked.lat} lng={clicked.lng} />
          </div>
        ) : null}
      </FloatingPhotoViewer>
    </>
  )
}
