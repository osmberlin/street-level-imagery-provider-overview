import { StreetImageryLocaleProvider } from '@osm-editor-kit/street-imagery-react'
import type { ReactNode } from 'react'
import { MapProvider } from 'react-map-gl/maplibre'
import { MapRoot } from '@/features/map/MapRoot'
import { StreetViewsToggle } from '@/features/map/StreetViewsToggle'
import { LocationPickHint } from '@/features/openers/LocationPickHint'
import { LeftPanel } from '@/features/panels/LeftPanel'
import { PhotoFloatingViewer } from '@/features/viewer/PhotoFloatingViewer'
import { useAppI18n } from '@/i18n/useAppI18n'

type AppShellProps = {
  children?: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  const { locale } = useAppI18n()

  return (
    <StreetImageryLocaleProvider locale={locale}>
      <MapProvider>
        <div className="relative flex h-full min-h-0 w-full overflow-hidden">
          <LeftPanel />
          <main className="relative min-h-0 min-w-0 flex-1">
            <MapRoot />
            <StreetViewsToggle />
            <PhotoFloatingViewer />
            <LocationPickHint />
            {children}
          </main>
        </div>
      </MapProvider>
    </StreetImageryLocaleProvider>
  )
}
