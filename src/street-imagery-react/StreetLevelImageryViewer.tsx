import { lazy, Suspense } from 'react'
import type { StreetImageryPhotoSelection } from '@/street-imagery-react/types'
import type { NormalizedPhoto } from '@/street-imagery/providers/model'

const MapillaryPanel = lazy(() =>
  import('@/street-imagery-react/panels/MapillaryPanel').then((module) => ({
    default: module.MapillaryPanel,
  })),
)

const PanoramaxPanel = lazy(() =>
  import('@/street-imagery-react/panels/PanoramaxPanel').then((module) => ({
    default: module.PanoramaxPanel,
  })),
)

type StreetLevelImageryViewerProps = {
  photo: NormalizedPhoto
  groupPhotos: NormalizedPhoto[]
  onPhotoSelected: (selection: StreetImageryPhotoSelection) => void
  onEaseMapToPoint: (lng: number, lat: number) => void
}

const ViewerPanelPlaceholder = () => (
  <div className="flex min-h-48 animate-pulse items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
    <span className="text-sm text-slate-500">Loading viewer…</span>
  </div>
)

export const StreetLevelImageryViewer = ({
  photo,
  groupPhotos,
  onPhotoSelected,
  onEaseMapToPoint,
}: StreetLevelImageryViewerProps) => {
  if (photo.providerId === 'mapillary') {
    return (
      <Suspense fallback={<ViewerPanelPlaceholder />}>
        <MapillaryPanel
          groupPhotos={groupPhotos}
          onEaseMapToPoint={onEaseMapToPoint}
          onPhotoSelected={onPhotoSelected}
          photo={photo}
        />
      </Suspense>
    )
  }

  if (photo.providerId === 'panoramax') {
    return (
      <Suspense fallback={<ViewerPanelPlaceholder />}>
        <PanoramaxPanel
          groupPhotos={groupPhotos}
          onEaseMapToPoint={onEaseMapToPoint}
          onPhotoSelected={onPhotoSelected}
          photo={photo}
        />
      </Suspense>
    )
  }

  return null
}
