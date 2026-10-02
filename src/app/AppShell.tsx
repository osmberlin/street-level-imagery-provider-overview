import type { ReactNode } from 'react'
import { MapProvider } from 'react-map-gl/maplibre'
import { TanStackAppDevtools } from '@/components/shared/devtools/TanStackAppDevtools'
import { MapRoot } from '@/features/map/MapRoot'
import { LocationPickHint } from '@/features/openers/LocationPickHint'
import { LeftPanel } from '@/features/panels/LeftPanel'
import { MapFeaturesFloatingCard } from '@/features/viewer/MapFeaturesFloatingCard'
import { PhotoFloatingViewer } from '@/features/viewer/PhotoFloatingViewer'

type AppShellProps = {
  children?: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <MapProvider>
      <div className="relative flex h-full min-h-0 w-full overflow-hidden">
        <LeftPanel />
        <main className="relative min-h-0 min-w-0 flex-1">
          <MapRoot />
          <MapFeaturesFloatingCard />
          <PhotoFloatingViewer />
          <LocationPickHint />
          {children}
        </main>
      </div>
      <TanStackAppDevtools />
    </MapProvider>
  )
}
