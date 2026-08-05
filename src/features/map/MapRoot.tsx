import type { MapLibreEvent } from 'maplibre-gl'
import { useState } from 'react'
import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { AttributionControl, Map, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { roundPositionForURL, type MapParam } from '@/app/mapParam'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { exposeMainMapForDebugging } from '@/features/map/exposeMainMapForDebugging'
import { useMapActions } from '@/features/map/map-store'
import { MapSelectionHighlight } from '@/features/map/MapSelectionHighlight'
import { rememberWrittenMapViewport } from '@/features/map/mapViewportSync'
import { ProviderLayers } from '@/features/map/ProviderLayers'
import { SyncMapCameraFromUrl } from '@/features/map/SyncMapCameraFromUrl'
import { ViewDirectionIndicator } from '@/features/map/ViewDirectionIndicator'
import {
  featureLayerId,
  isClickOnlyPhotoProvider,
  photoLayerId,
} from '@/features/providers/registry'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const isNearZeroAngle = (value: number) => Math.abs(value) < 0.05

export { MAIN_MAP_ID } from '@/features/map/constants'

export const MapRoot = () => {
  const { map, search, updateMapViewport, updateSearch } = useAppSearchNavigation()
  const { providers, style, photoTypes, date } = search
  const bbox = useMapViewportBbox()
  const [cursor, setCursor] = useState('grab')
  const { markMapLoaded } = useMapActions()

  const interactiveLayerIds = [
    ...providers.map((providerId) => photoLayerId(providerId)),
    ...providers.map((providerId) => featureLayerId(providerId)),
  ]

  const handleLoad = (event: MapLibreEvent) => {
    markMapLoaded()
    exposeMainMapForDebugging(event.target)
  }

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom, bearing, pitch } = event.viewState
    const [lat, lng, roundedZoom] = roundPositionForURL(latitude, longitude, zoom)
    const nextViewport: MapParam = { zoom: roundedZoom, lat, lng }
    // Persist rotate/pitch when the user has tilted the camera; omit for flat 2D URLs.
    if (!isNearZeroAngle(bearing) || !isNearZeroAngle(pitch)) {
      nextViewport.bearing = bearing
      nextViewport.pitch = pitch
    }
    rememberWrittenMapViewport(nextViewport)
    updateMapViewport(nextViewport)
  }

  const hasClickOnlyProvider = providers.some((providerId) => isClickOnlyPhotoProvider(providerId))

  const handleClick = (event: MapLayerMouseEvent) => {
    const features = event.features ?? []
    const clickPoint = {
      lng: Math.round(event.lngLat.lng * 1e6) / 1e6,
      lat: Math.round(event.lngLat.lat * 1e6) / 1e6,
    }

    if (features.length === 0 && !hasClickOnlyProvider) {
      updateSearch({ clicked: undefined, selected: undefined }, { replace: true })
      return
    }

    updateSearch(
      {
        clicked: clickPoint,
        selected: undefined,
      },
      { replace: true },
    )
  }

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    setCursor(event.features?.length ? 'pointer' : 'grab')
  }

  const handleMouseLeave = () => {
    setCursor('grab')
  }

  return (
    <Map
      id={MAIN_MAP_ID}
      initialViewState={{
        longitude: map.lng,
        latitude: map.lat,
        zoom: map.zoom,
        bearing: map.bearing ?? 0,
        pitch: map.pitch ?? 0,
      }}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
      onLoad={handleLoad}
      onMoveEnd={handleMoveEnd}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <AttributionControl compact position="bottom-left" />
      <NavigationControl position="top-right" showCompass visualizePitch />
      <SyncMapCameraFromUrl />
      <ProviderLayers
        bbox={bbox}
        date={date}
        photoTypes={photoTypes}
        providerIds={providers}
        style={style}
        zoom={map.zoom}
      />
      <ViewDirectionIndicator />
      <MapSelectionHighlight />
    </Map>
  )
}
