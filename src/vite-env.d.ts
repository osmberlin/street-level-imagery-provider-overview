/// <reference types="vite/client" />

import type { Map as MaplibreMap } from 'maplibre-gl'

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_PLAYWRIGHT_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    __mainMap?: MaplibreMap
    __PLAYWRIGHT_ENABLED?: string
  }
}

export {}

declare module '@panoramax/web-viewer' {}
