import type { ReactNode } from 'react'
import { MapProvider } from 'react-map-gl/maplibre'
import { TanStackAppDevtools } from '@/components/shared/devtools/TanStackAppDevtools'
import { MapRoot } from '@/features/map/MapRoot'
import { LeftPanel } from '@/features/panels/LeftPanel'
import { RightPanel } from '@/features/panels/RightPanel'

type AppShellProps = {
  children?: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <MapProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <LeftPanel />
        <main className="relative min-h-0 min-w-0 flex-1">
          <MapRoot />
          {children}
        </main>
        <RightPanel />
      </div>
      <TanStackAppDevtools />
    </MapProvider>
  )
}
