import { useEffect, useRef } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { isProviderId } from '@/app/searchSchema'
import { useAllProviderMapFeaturesLoading } from '@/features/data/useAllProviderMapFeatures'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import {
  collectNearbyStreetsidePhotos,
  findGroupBySelection,
  findNearestPhoto,
  type PhotoSequenceGroup,
} from '@/features/viewer/groupClickedPhotos'
import { MapFeatureCard } from '@/features/viewer/MapFeatureCard'
import { SequenceGroupCard } from '@/features/viewer/SequenceGroupCard'
import { useClickedMapFeatures } from '@/features/viewer/useClickedMapFeatures'
import { useClickedPhotos } from '@/features/viewer/useClickedPhotos'

export const RightPanel = () => {
  const { search, updateSelected } = useAppSearchNavigation()
  const { clicked, selected, providers, map } = search
  const bbox = useMapViewportBbox()
  const { groups, isLoading: photosLoading, isFetching: photosFetching } = useClickedPhotos()
  const mapFeatures = useClickedMapFeatures()
  const { isLoading: featuresLoading, isFetching: featuresFetching } =
    useAllProviderMapFeaturesLoading(providers, bbox, map.z)

  const isLoading = photosLoading || featuresLoading
  const isFetching = photosFetching || featuresFetching
  const hasResults = groups.length > 0 || mapFeatures.length > 0
  const showLoading = clicked != null && (isLoading || isFetching) && !hasResults

  const selectGroup = (group: PhotoSequenceGroup) => {
    if (!clicked) {
      return
    }

    const nearest = findNearestPhoto(group.photos, clicked.lng, clicked.lat)
    if (!nearest) {
      return
    }

    updateSelected({
      provider: group.providerId,
      sequenceId: group.sequenceId,
      photoId: nearest.photoId,
    })
  }

  const stepPhoto = (group: PhotoSequenceGroup, photoId: string) => {
    updateSelected({
      provider: group.providerId,
      sequenceId: group.sequenceId,
      photoId,
    })
  }

  const activeGroup =
    selected != null && isProviderId(selected.provider) && selected.photoId
      ? findGroupBySelection(
          groups,
          selected.provider,
          // Photos without a sequence are grouped under a photo:<id> fallback key.
          selected.sequenceId ?? `photo:${selected.photoId}`,
        )
      : null

  const activeStreetsideNearbyPhotos =
    activeGroup?.providerId === 'streetside' && selected?.photoId
      ? (() => {
          const activePhoto =
            activeGroup.photos.find((photo) => photo.photoId === selected.photoId) ??
            activeGroup.photos[0]
          return activePhoto ? collectNearbyStreetsidePhotos(groups, activePhoto) : undefined
        })()
      : undefined

  const resultCount = groups.length + mapFeatures.length
  const autoSelectKeyRef = useRef<string | null>(null)

  useEffect(
    function resetAutoSelectOnNewClick() {
      autoSelectKeyRef.current = null
    },
    [clicked?.lng, clicked?.lat],
  )

  useEffect(
    function autoSelectSinglePhotoGroup() {
      // Wait for all providers so a fast provider's lone group is not selected prematurely.
      if (isLoading || isFetching) {
        return
      }
      if (!clicked || selected != null || mapFeatures.length > 0 || groups.length !== 1) {
        return
      }

      const group = groups[0]
      if (!group) {
        return
      }

      const key = `${clicked.lng},${clicked.lat},${group.groupKey}`
      if (autoSelectKeyRef.current === key) {
        return
      }

      const nearest = findNearestPhoto(group.photos, clicked.lng, clicked.lat)
      if (!nearest) {
        return
      }

      autoSelectKeyRef.current = key
      updateSelected({
        provider: group.providerId,
        sequenceId: group.sequenceId,
        photoId: nearest.photoId,
      })
    },
    [clicked, groups, isFetching, isLoading, mapFeatures.length, selected, updateSelected],
  )

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-900">Photo viewer</h2>
        <p className="mt-1 text-xs text-slate-500">
          {clicked
            ? `${resultCount} result${resultCount === 1 ? '' : 's'} near your click`
            : 'Click the map to explore imagery here.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!clicked ? (
          <div className="flex h-full items-center justify-center px-2 text-center">
            <p className="text-sm leading-relaxed text-slate-500">
              Click the map to explore imagery here.
            </p>
          </div>
        ) : showLoading ? (
          <div className="flex h-full items-center justify-center px-2 text-center">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
              />
              Loading imagery…
            </p>
          </div>
        ) : !hasResults ? (
          <div className="flex h-full items-center justify-center px-2 text-center">
            <p className="text-sm leading-relaxed text-slate-500">
              No photos or map features from enabled providers in this area yet. Try zooming in,
              enabling more providers, or adjusting filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mapFeatures.length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Map features
                </h3>
                <ul className="space-y-3">
                  {mapFeatures.map((feature) => (
                    <li key={`${feature.providerId}:${feature.featureId}`}>
                      <MapFeatureCard feature={feature} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {groups.length > 0 ? (
              <section>
                {mapFeatures.length > 0 ? (
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Photo sequences
                  </h3>
                ) : null}
                <ul className="space-y-3">
                  {groups.map((group) => (
                    <li key={group.groupKey}>
                      <SequenceGroupCard
                        group={group}
                        nearbyPhotos={
                          activeGroup?.groupKey === group.groupKey
                            ? activeStreetsideNearbyPhotos
                            : undefined
                        }
                        selected={activeGroup?.groupKey === group.groupKey ? selected : undefined}
                        onSelectGroup={selectGroup}
                        onStepPhoto={(photoId) => {
                          stepPhoto(group, photoId)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  )
}
