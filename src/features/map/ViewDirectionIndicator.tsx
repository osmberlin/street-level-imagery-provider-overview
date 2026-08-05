import { Layer, Source } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { coneRadiusMeters, viewConeGeoJson } from '@/features/map/viewCone'
import { useViewerBearing, useViewerHfov, useViewerLngLat } from '@/features/viewer/useViewerStore'

const CONE_SOURCE_ID = 'view-direction-cone'
const CONE_FILL_LAYER_ID = 'view-direction-cone-fill'
const CONE_LINE_LAYER_ID = 'view-direction-cone-line'

const INTERACTIVE_PANO_PROVIDERS = new Set([
  'mapillary',
  'panoramax',
  'streetside',
  'kartaview',
  'mapilio',
  'vegbilder',
])

export const ViewDirectionIndicator = () => {
  const { map, search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { selected, providers, photoTypes, date } = search
  const storeBearing = useViewerBearing()
  const storeHfov = useViewerHfov()
  const storeLngLat = useViewerLngLat()

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.zoom, photoTypes, date)

  const selectedPhoto = selected
    ? (allPhotos.find(
        (photo) =>
          photo.providerId === selected.provider &&
          photo.photoId === selected.photoId &&
          (photo.sequenceId ?? `photo:${photo.photoId}`) === selected.sequenceId,
      ) ?? null)
    : null

  let coneFeature: ReturnType<typeof viewConeGeoJson> | null = null
  if (selectedPhoto) {
    const apex = storeLngLat ?? selectedPhoto.lngLat
    const isPano = selectedPhoto.isPano === true
    const hasLiveBearing = isPano && INTERACTIVE_PANO_PROVIDERS.has(selectedPhoto.providerId)

    let bearing: number | null = null
    let fov = 30

    if (isPano) {
      bearing = hasLiveBearing ? (storeBearing ?? selectedPhoto.heading) : selectedPhoto.heading
      fov = hasLiveBearing ? (storeHfov ?? 60) : 60
    } else if (selectedPhoto.providerId === 'panoramax') {
      bearing = storeBearing ?? selectedPhoto.heading
      fov = 30
    } else {
      bearing = selectedPhoto.heading
      fov = 30
    }

    if (bearing != null) {
      coneFeature = viewConeGeoJson(apex, bearing, fov, coneRadiusMeters(map.zoom))
    }
  }

  if (!selectedPhoto || !coneFeature) {
    return null
  }

  return (
    <>
      <Source id={CONE_SOURCE_ID} type="geojson" data={coneFeature} />
      <Layer
        id={CONE_FILL_LAYER_ID}
        type="fill"
        source={CONE_SOURCE_ID}
        paint={{
          'fill-color': '#0f172a',
          'fill-opacity': 0.15,
        }}
      />
      <Layer
        id={CONE_LINE_LAYER_ID}
        type="line"
        source={CONE_SOURCE_ID}
        paint={{
          'line-color': '#0f172a',
          'line-width': 1.5,
          'line-opacity': 0.5,
        }}
      />
    </>
  )
}
