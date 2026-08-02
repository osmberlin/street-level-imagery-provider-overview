import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { router } from '@/app/router'
import './index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}mapilio-geo-sw.js`, {
    scope: import.meta.env.BASE_URL,
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
    },
  },
})

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
