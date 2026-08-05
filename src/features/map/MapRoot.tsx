import type { MapLibreEvent } from 'maplibre-gl'
import { useMemo, useState } from 'react'
import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { AttributionControl, Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { roundPositionForURL } from '@/app/mapParam'
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

export { MAIN_MAP_ID } from '@/features/map/constants'

export const MapRoot = () => {
  const { search, updateMapViewport, updateSearch } = useAppSearchNavigation()
  const { map, providers, style, photoTypes, date } = search
  const bbox = useMapViewportBbox()
  const [cursor, setCursor] = useState('grab')
  const { markMapLoaded } = useMapActions()

  const interactiveLayerIds = useMemo(
    () => [
      ...providers.map((providerId) => photoLayerId(providerId)),
      ...providers.map((providerId) => featureLayerId(providerId)),
    ],
    [providers],
  )

  const handleLoad = (event: MapLibreEvent) => {
    markMapLoaded()
    exposeMainMapForDebugging(event.target)
  }

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = event.viewState
    const [lat, lng, roundedZoom] = roundPositionForURL(latitude, longitude, zoom)
    const nextViewport = { zoom: roundedZoom, lat, lng }
    rememberWrittenMapViewport(nextViewport)
    updateMapViewport(nextViewport)
  }

  const hasClickOnlyProvider = useMemo(
    () => providers.some((providerId) => isClickOnlyPhotoProvider(providerId)),
    [providers],
  )

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
      }}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      RTLTextPlugin={false}
      dragRotate={false}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
      onLoad={handleLoad}
      onMoveEnd={handleMoveEnd}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <AttributionControl compact position="bottom-left" />
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
