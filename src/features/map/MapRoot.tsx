import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapLayerMouseEvent, MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useAppSearchNavigation } from '@/app/searchNavigation'
import { roundMapForUrl, type MapSearch } from '@/app/searchSchema'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { MapSelectionHighlight } from '@/features/map/MapSelectionHighlight'
import { ProviderLayers } from '@/features/map/ProviderLayers'
import { featureLayerId, photoLayerId } from '@/features/providers/registry'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export { MAIN_MAP_ID } from '@/features/map/constants'

export const MapRoot = () => {
  const { search, updateMapViewport, updateSearch } = useAppSearchNavigation()
  const { map, providers, style, photoTypes, date } = search
  const bbox = useMapViewportBbox()
  const [cursor, setCursor] = useState('grab')
  const mapRef = useRef<MapRef>(null)
  // Viewport this component last wrote to the URL, so external URL changes
  // (back/forward, pasted links) can be told apart from our own move echoes.
  const lastWrittenViewportRef = useRef<MapSearch | null>(null)

  useEffect(
    function syncCameraWithUrlViewport() {
      const mapInstance = mapRef.current
      if (!mapInstance) {
        return
      }

      const lastWritten = lastWrittenViewportRef.current
      if (
        lastWritten &&
        lastWritten.lat === map.lat &&
        lastWritten.lon === map.lon &&
        lastWritten.z === map.z
      ) {
        return
      }

      const center = mapInstance.getCenter()
      const zoom = mapInstance.getZoom()
      const alreadyThere =
        Math.abs(center.lat - map.lat) < 1e-5 &&
        Math.abs(center.lng - map.lon) < 1e-5 &&
        Math.abs(zoom - map.z) < 0.01
      if (alreadyThere) {
        return
      }

      mapInstance.jumpTo({ center: [map.lon, map.lat], zoom: map.z })
    },
    [map.lat, map.lon, map.z],
  )

  const interactiveLayerIds = useMemo(
    () => [
      ...providers.map((providerId) => photoLayerId(providerId)),
      ...providers.map((providerId) => featureLayerId(providerId)),
    ],
    [providers],
  )

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = event.viewState
    const nextViewport = roundMapForUrl({
      z: zoom,
      lat: latitude,
      lon: longitude,
    })
    lastWrittenViewportRef.current = nextViewport
    updateMapViewport(nextViewport)
  }

  const handleClick = (event: MapLayerMouseEvent) => {
    const features = event.features ?? []

    if (features.length === 0) {
      updateSearch({ clicked: undefined, selected: undefined }, { replace: true })
      return
    }

    updateSearch(
      {
        clicked: {
          lng: Math.round(event.lngLat.lng * 1e6) / 1e6,
          lat: Math.round(event.lngLat.lat * 1e6) / 1e6,
        },
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
      ref={mapRef}
      id={MAIN_MAP_ID}
      initialViewState={{
        longitude: map.lon,
        latitude: map.lat,
        zoom: map.z,
      }}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
      onMoveEnd={handleMoveEnd}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <ProviderLayers
        bbox={bbox}
        date={date}
        photoTypes={photoTypes}
        providerIds={providers}
        style={style}
        zoom={map.z}
      />
      <MapSelectionHighlight />
    </Map>
  )
}
