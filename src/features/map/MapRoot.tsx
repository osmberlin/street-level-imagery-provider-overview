import { useMemo, useState } from 'react'
import type { MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useAppSearchNavigation } from '@/app/searchNavigation'
import { roundMapForUrl } from '@/app/searchSchema'
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

  const interactiveLayerIds = useMemo(
    () => [
      ...providers.map((providerId) => photoLayerId(providerId)),
      ...providers.map((providerId) => featureLayerId(providerId)),
    ],
    [providers],
  )

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = event.viewState
    updateMapViewport(
      roundMapForUrl({
        z: zoom,
        lat: latitude,
        lon: longitude,
      }),
    )
  }

  const handleClick = (event: MapLayerMouseEvent) => {
    const features = event.features ?? []

    if (features.length === 0) {
      updateSearch({ clicked: undefined, selected: undefined }, { replace: true })
      return
    }

    updateSearch(
      {
        clicked: { lng: event.lngLat.lng, lat: event.lngLat.lat },
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
