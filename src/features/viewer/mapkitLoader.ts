export const getAppleMapKitToken = (): string | undefined => {
  const token = import.meta.env.VITE_APPLE_MAPKIT_TOKEN
  return typeof token === 'string' && token.length > 0 ? token : undefined
}

type MapKitGlobal = {
  loadedLibraries: string[]
  Coordinate: new (latitude: number, longitude: number) => unknown
  Geocoder: new (options?: { language?: string }) => {
    reverseLookup: (
      coordinate: unknown,
      callback: (error: Error | null, data: { results?: unknown[] }) => void,
    ) => void
  }
  LookAroundPreview: new (
    parent: HTMLElement,
    location: unknown,
    options?: { openDialog?: boolean; showsDialogControl?: boolean },
  ) => { destroy: () => void; addEventListener: (type: string, listener: () => void) => void }
}

declare global {
  interface Window {
    mapkit?: MapKitGlobal
    initMapKit?: () => void
  }
}

let loadPromise: Promise<MapKitGlobal> | null = null

export const loadMapKitJs = (token: string): Promise<MapKitGlobal> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapKit JS requires a browser'))
  }

  if (window.mapkit && window.mapkit.loadedLibraries.length > 0) {
    return Promise.resolve(window.mapkit)
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mapkit-loader="true"]')
    if (existing) {
      window.initMapKit = () => {
        delete window.initMapKit
        if (window.mapkit) {
          resolve(window.mapkit)
        } else {
          reject(new Error('MapKit JS failed to initialize'))
        }
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.apple-mapkit.com/mk/6/mapkit.core.js'
    script.crossOrigin = 'anonymous'
    script.async = true
    script.dataset.mapkitLoader = 'true'
    script.dataset.libraries = 'services,look-around'
    script.dataset.token = token
    script.dataset.callback = 'initMapKit'
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load MapKit JS'))
    }

    window.initMapKit = () => {
      delete window.initMapKit
      if (window.mapkit) {
        resolve(window.mapkit)
      } else {
        loadPromise = null
        reject(new Error('MapKit JS failed to initialize'))
      }
    }

    document.head.appendChild(script)
  })

  return loadPromise
}
