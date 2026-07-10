import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAllProviderPhotos } from '@/features/data/useAllProviderPhotos'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { coneRadiusMeters, viewConeGeoJson } from '@/features/map/viewCone'
import { useViewerBearing, useViewerHfov, useViewerLngLat } from '@/features/viewer/useViewerStore'

const CONE_SOURCE_ID = 'view-direction-cone'
const CONE_FILL_LAYER_ID = 'view-direction-cone-fill'
const CONE_LINE_LAYER_ID = 'view-direction-cone-line'

const INTERACTIVE_VIEWER_PROVIDERS = new Set(['mapillary', 'panoramax'])

export const ViewDirectionIndicator = () => {
  const { search } = useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const { selected, providers, map, photoTypes, date } = search
  const storeBearing = useViewerBearing()
  const storeHfov = useViewerHfov()
  const storeLngLat = useViewerLngLat()

  const { photos: allPhotos } = useAllProviderPhotos(providers, bbox, map.z, photoTypes, date)

  const selectedPhoto = useMemo(() => {
    if (!selected) {
      return null
    }
    return (
      allPhotos.find(
        (photo) =>
          photo.providerId === selected.provider &&
          photo.photoId === selected.photoId &&
          (photo.sequenceId ?? `photo:${photo.photoId}`) === selected.sequenceId,
      ) ?? null
    )
  }, [allPhotos, selected])

  const coneFeature = useMemo(() => {
    if (!selectedPhoto) {
      return null
    }

    const apex = storeLngLat ?? selectedPhoto.lngLat
    const isPano = selectedPhoto.isPano === true
    const hasInteractiveViewer = INTERACTIVE_VIEWER_PROVIDERS.has(selectedPhoto.providerId)

    let bearing: number | null = null
    let fov = 30

    if (isPano) {
      bearing = storeBearing ?? selectedPhoto.heading
      fov = storeHfov ?? 60
    } else if (hasInteractiveViewer) {
      bearing = storeBearing ?? selectedPhoto.heading
      fov = 30
    } else {
      bearing = selectedPhoto.heading
      fov = 30
    }

    if (bearing == null) {
      return null
    }

    return viewConeGeoJson(apex, bearing, fov, coneRadiusMeters(map.z))
  }, [map.z, selectedPhoto, storeBearing, storeHfov, storeLngLat])

  if (!selectedPhoto || !coneFeature) {
    return null
  }

  return (
    <Source id={CONE_SOURCE_ID} type="geojson" data={coneFeature}>
      <Layer
        id={CONE_FILL_LAYER_ID}
        type="fill"
        paint={{
          'fill-color': '#0f172a',
          'fill-opacity': 0.15,
        }}
      />
      <Layer
        id={CONE_LINE_LAYER_ID}
        type="line"
        paint={{
          'line-color': '#0f172a',
          'line-width': 1.5,
          'line-opacity': 0.5,
        }}
      />
    </Source>
  )
}
