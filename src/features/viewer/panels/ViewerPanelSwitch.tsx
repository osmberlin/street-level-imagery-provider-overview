import { lazy, Suspense, useEffect } from 'react'
import type { NormalizedPhoto } from '@/features/providers/model'
import { PhotoMetadata } from '@/features/viewer/PhotoMetadata'
import { PhotoViewer } from '@/features/viewer/PhotoViewer'
import { useViewerActions } from '@/features/viewer/useViewerStore'

const MapillaryPanel = lazy(() =>
  import('@/features/viewer/panels/MapillaryPanel').then((module) => ({
    default: module.MapillaryPanel,
  })),
)

type ViewerPanelSwitchProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
}

const MapillaryPanelPlaceholder = () => (
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
        <Suspense fallback={<MapillaryPanelPlaceholder />}>
          <MapillaryPanel photo={photo} groupPhotos={groupPhotos} />
        </Suspense>
        <PhotoMetadata photo={photo} />
      </div>
    )
  }

  return <PhotoViewer photo={photo} />
}
