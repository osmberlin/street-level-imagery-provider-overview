import {
  createStreetImageryConfig,
  registerProviderAdapters,
  setStreetImageryConfig,
} from '@osm-editor-kit/street-imagery'
import { ALL_PROVIDER_ADAPTERS } from '@osm-editor-kit/street-imagery/providers/all'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient, router } from '@/app/router'
import { BING_MAPS_KEY, GOOGLE_MAPS_API_KEY, INFRA3D_PROJECTS, MAPILLARY_TOKEN } from '@/config'
import './index.css'

setStreetImageryConfig(
  createStreetImageryConfig({
    mapillaryToken: MAPILLARY_TOKEN,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    bingMapsKey: BING_MAPS_KEY,
    infra3d: { projects: INFRA3D_PROJECTS },
  }),
)

// This app shows every provider; apps that use a few register those from their own entries.
registerProviderAdapters(ALL_PROVIDER_ADAPTERS)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
