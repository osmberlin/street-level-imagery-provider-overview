import type { Map as MaplibreMap } from 'maplibre-gl'

export const exposeMainMapForDebugging = (map?: MaplibreMap) => {
  const playwrightEnabled =
    import.meta.env.VITE_PLAYWRIGHT_ENABLED === 'true' ||
    (typeof window !== 'undefined' &&
      (window as Window & { __PLAYWRIGHT_ENABLED?: string }).__PLAYWRIGHT_ENABLED === 'true')
  if (import.meta.env.DEV || playwrightEnabled) {
    window.__mainMap = map
  }
}
