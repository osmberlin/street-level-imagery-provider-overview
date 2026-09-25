import { isClickOnlyPhotoProvider } from '@osm-editor-kit/street-imagery'
import { useMapViewportBbox } from '@osm-editor-kit/street-imagery-react'
import { streetImageryInteractiveLayerIds } from '@osm-editor-kit/street-imagery-react'
import { StreetLevelImagerySourcesAndLayers } from '@osm-editor-kit/street-imagery-react'
import type { MapLibreEvent } from 'maplibre-gl'
import { useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { AttributionControl, Map, NavigationControl } from 'react-map-gl/maplibre'
import { roundPositionForURL, type MapParam } from '@/app/mapParam'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { exposeMainMapForDebugging } from '@/features/map/exposeMainMapForDebugging'
import { useMapActions } from '@/features/map/map-store'
import { rememberWrittenMapViewport } from '@/features/map/mapViewportSync'
import { SyncMapCameraFromUrl } from '@/features/map/SyncMapCameraFromUrl'
import {
  getMapFeatureStyleDefinition,
  getStyleDefinition,
} from '@/features/styles/styleDefinitions'
import { useSelectedPhotoForMap } from '@/features/viewer/useSelectedPhotoForMap'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const isNearZeroAngle = (value: number) => Math.abs(value) < 0.05

export { MAIN_MAP_ID } from '@/features/map/constants'

export const MapRoot = () => {
  const { map, search, updateMapViewport, updateSearch } = useAppSearchNavigation()
  const { providers, style, photoTypes, date } = search
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const { selectedPhoto, selectedSequenceId, viewerPov } = useSelectedPhotoForMap()
  const [cursor, setCursor] = useState('grab')
  const { markMapLoaded } = useMapActions()

  const styleDefinition = getStyleDefinition(style)
  const mapFeatureStyleDefinition = getMapFeatureStyleDefinition(style)

  const interactiveLayerIds = streetImageryInteractiveLayerIds(providers)

  const handleLoad = (event: MapLibreEvent) => {
    markMapLoaded()
    exposeMainMapForDebugging(event.target)
  }

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom, bearing, pitch } = event.viewState
    const [lat, lng, roundedZoom] = roundPositionForURL(latitude, longitude, zoom)
    const nextViewport: MapParam = { zoom: roundedZoom, lat, lng }
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
      RTLTextPlugin={false}
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
      <StreetLevelImagerySourcesAndLayers
        bbox={bbox}
        filter={{ photoTypes, date }}
        options={{
          mapFeatureCircleColor: mapFeatureStyleDefinition.circleColorExpression,
          photoCircleColor: styleDefinition.circleColorExpression,
          selectedPhoto,
          selectedSequenceId,
          showSelectionHighlight: true,
          showSequences: true,
          showViewCone: true,
          viewerPov,
        }}
        providers={providers}
        zoom={map.zoom}
      />
    </Map>
  )
}
