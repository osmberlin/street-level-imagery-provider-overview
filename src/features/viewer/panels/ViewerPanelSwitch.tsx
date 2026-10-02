import type { NormalizedPhoto } from '@osm-editor-kit/street-imagery'
import type { ProviderId } from '@osm-editor-kit/street-imagery'
import {
  StreetLevelImageryViewer,
  type MapillaryLookAt,
} from '@osm-editor-kit/street-imagery-react'
import { useViewerActions } from '@osm-editor-kit/street-imagery-react'
import { lazy, Suspense, useEffect } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useEaseMainMapToPoint } from '@/features/map/useStableMainMapRefs'
import { PhotoStaticPreview } from '@/features/viewer/PhotoViewer'

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
  /** Mapillary: full photo data for images reached inside the viewer. */
  onViewerPhoto?: (photo: NormalizedPhoto) => void
  /** Mapillary 360° photos: open looking this way (suggested view direction). */
  lookAtBearing?: number | null
  /** Mapillary: turn to a place (a map feature) and outline it. */
  lookAt?: MapillaryLookAt | null
}

const ViewerPanelPlaceholder = () => (
  <div className="flex min-h-48 animate-pulse items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
    <span className="text-sm text-slate-500">Loading viewer…</span>
  </div>
)

export const ViewerPanelSwitch = ({
  photo,
  groupPhotos,
  onViewerPhoto,
  lookAtBearing,
  lookAt,
}: ViewerPanelSwitchProps) => {
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
      <StreetLevelImageryViewer
        groupPhotos={groupPhotos}
        onEaseMapToPoint={easeMainMapToPoint}
        onPhotoSelected={updateSelected}
        lookAt={lookAt}
        lookAtBearing={lookAtBearing}
        onViewerPhoto={onViewerPhoto}
        photo={photo}
      />
    )
  }

  if (photo.providerId === 'streetside') {
    return (
      <Suspense fallback={<ViewerPanelPlaceholder />}>
        <StreetsidePanel photo={photo} groupPhotos={groupPhotos} />
      </Suspense>
    )
  }

  if (PSV_FLAT_PROVIDERS.has(photo.providerId)) {
    const Panel = photo.isPano === true ? PsvPanoPanel : FlatPhotoPanel
    return (
      <Suspense fallback={<ViewerPanelPlaceholder />}>
        <Panel
          key={`${photo.providerId}:${photo.sequenceId ?? photo.photoId}`}
          photo={photo}
          groupPhotos={groupPhotos}
        />
      </Suspense>
    )
  }

  return <PhotoStaticPreview photo={photo} />
}
