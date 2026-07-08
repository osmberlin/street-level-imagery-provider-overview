import { MapProvider } from 'react-map-gl/maplibre'
import { MapRoot } from '@/features/map/MapRoot'
import { LeftPanel } from '@/features/panels/LeftPanel'
import { RightPanel } from '@/features/panels/RightPanel'

export const AppShell = () => {
  return (
    <MapProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <LeftPanel />
        <main className="relative min-h-0 min-w-0 flex-1">
          <MapRoot />
        </main>
        <RightPanel />
      </div>
    </MapProvider>
  )
}
