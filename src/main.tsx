import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient, router } from '@/app/router'
import { createStreetImageryConfig, setStreetImageryConfig } from '@/street-imagery/config'
import './index.css'

setStreetImageryConfig(
  createStreetImageryConfig({
    mapillaryToken: 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf',
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
