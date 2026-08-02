// Proxies Mapilio GeoServer WMTS tiles for static hosting (geo.mapilio.com has no CORS headers).
const MAPILIO_GEO_ORIGIN = 'https://geo.mapilio.com'
const MAPILIO_GEO_PREFIX = '/mapilio-geo'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const prefixIndex = url.pathname.indexOf(MAPILIO_GEO_PREFIX)
  if (prefixIndex === -1) {
    return
  }

  const targetPath = url.pathname.slice(prefixIndex + MAPILIO_GEO_PREFIX.length)
  const targetUrl = `${MAPILIO_GEO_ORIGIN}${targetPath}${url.search}`

  event.respondWith(fetch(targetUrl))
})
