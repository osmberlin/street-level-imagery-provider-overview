import { lazy, Suspense, useEffect } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useEaseMainMapToPoint } from '@/features/map/useStableMainMapRefs'
import { PhotoMetadata } from '@/features/viewer/PhotoMetadata'
import { PhotoViewer } from '@/features/viewer/PhotoViewer'
import { StreetLevelImageryViewer } from '@/street-imagery-react/StreetLevelImageryViewer'
import { useViewerActions } from '@/street-imagery-react/useViewerStore'
import type { NormalizedPhoto } from '@/street-imagery/providers/model'
import type { ProviderId } from '@/street-imagery/providers/registry'

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

const StreetsidePanel = lazy(() =>
  import('@/features/viewer/panels/StreetsidePanel').then((module) => ({
    default: module.StreetsidePanel,
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
  const { updateSelected } = useAppSearchNavigation()
  const easeMainMapToPoint = useEaseMainMapToPoint()

  useEffect(
    function resetViewerStoreOnProviderChange() {
      actions.reset()
    },
    [actions, photo.providerId],
  )

  if (photo.providerId === 'mapillary' || photo.providerId === 'panoramax') {
    return (
      <div className="space-y-3">
        <StreetLevelImageryViewer
          groupPhotos={groupPhotos}
          onEaseMapToPoint={easeMainMapToPoint}
          onPhotoSelected={updateSelected}
          photo={photo}
        />
        <PhotoMetadata photo={photo} />
      </div>
    )
  }

  if (photo.providerId === 'streetside') {
    return (
      <div className="space-y-3">
        <Suspense fallback={<ViewerPanelPlaceholder />}>
          <StreetsidePanel photo={photo} groupPhotos={groupPhotos} />
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
