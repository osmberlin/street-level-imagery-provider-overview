import { lazy, Suspense, useEffect } from 'react'
import type { NormalizedPhoto } from '@/features/providers/model'
import type { ProviderId } from '@/features/providers/registry'
import { PhotoMetadata } from '@/features/viewer/PhotoMetadata'
import { PhotoViewer } from '@/features/viewer/PhotoViewer'
import { useViewerActions } from '@/features/viewer/useViewerStore'

const MapillaryPanel = lazy(() =>
  import('@/features/viewer/panels/MapillaryPanel').then((module) => ({
    default: module.MapillaryPanel,
  })),
)

const PanoramaxPanel = lazy(() =>
  import('@/features/viewer/panels/PanoramaxPanel').then((module) => ({
    default: module.PanoramaxPanel,
  })),
)

const PsvPanoPanel = lazy(() =>
  import('@/features/viewer/panels/PsvPanoPanel').then((module) => ({
    default: module.PsvPanoPanel,
  })),
)

const FlatPhotoPanel = lazy(() =>
  import('@/features/viewer/panels/FlatPhotoPanel').then((module) => ({
    default: module.FlatPhotoPanel,
  })),
)

const PSV_FLAT_PROVIDERS = new Set<ProviderId>(['kartaview', 'mapilio', 'vegbilder'])

type ViewerPanelSwitchProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

const ViewerPanelPlaceholder = () => (
  <div className="flex min-h-48 animate-pulse items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
    <span className="text-sm text-slate-500">Loading viewer…</span>
  </div>
)

export const ViewerPanelSwitch = ({ photo, groupPhotos }: ViewerPanelSwitchProps) => {
  const actions = useViewerActions()

  useEffect(
    function resetViewerStoreOnProviderChange() {
      actions.reset()
    },
    [actions, photo.providerId],
  )

  if (photo.providerId === 'mapillary') {
    return (
      <div className="space-y-3">
        <Suspense fallback={<ViewerPanelPlaceholder />}>
          <MapillaryPanel photo={photo} groupPhotos={groupPhotos} />
        </Suspense>
        <PhotoMetadata photo={photo} />
      </div>
    )
  }

  if (photo.providerId === 'panoramax') {
    return (
      <div className="space-y-3">
        <Suspense fallback={<ViewerPanelPlaceholder />}>
          <PanoramaxPanel photo={photo} groupPhotos={groupPhotos} />
        </Suspense>
        <PhotoMetadata photo={photo} />
      </div>
    )
  }

  if (PSV_FLAT_PROVIDERS.has(photo.providerId)) {
    const Panel = photo.isPano === true ? PsvPanoPanel : FlatPhotoPanel
    return (
      <div className="space-y-3">
        <Suspense fallback={<ViewerPanelPlaceholder />}>
          <Panel
            key={`${photo.providerId}:${photo.sequenceId ?? photo.photoId}`}
            photo={photo}
            groupPhotos={groupPhotos}
          />
        </Suspense>
        <PhotoMetadata photo={photo} />
      </div>
    )
  }

  return <PhotoViewer photo={photo} />
}
