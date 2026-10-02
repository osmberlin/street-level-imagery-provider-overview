import { createStreetImageryConfig, setStreetImageryConfig } from '@osm-editor-kit/street-imagery'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient, router } from '@/app/router'
import { GOOGLE_MAPS_API_KEY, INFRA3D_PROJECT_UID, MAPILLARY_TOKEN } from '@/config'
import './index.css'

setStreetImageryConfig(
  createStreetImageryConfig({
    mapillaryToken: MAPILLARY_TOKEN,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    infra3d: { projectUid: INFRA3D_PROJECT_UID },
  }),
)

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
