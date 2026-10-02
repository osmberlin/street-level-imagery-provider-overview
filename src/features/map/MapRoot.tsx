import '@/features/map/maplibre-worker'
import {
  isClickOnlyPhotoProvider,
  snapToLine,
  viewpointFromPoint,
  viewpointsFromLine,
  type LngLat,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  LocationPickOnMap,
  queryStreetImageryFeatures,
  StreetLevelImagerySourcesAndLayers,
  streetImageryInteractiveLayerIds,
  useArmedLocationOpenerId,
  useMapViewportBbox,
  useViewpointLine,
  VIEWPOINT_DIRECTION_LAYER_ID,
  ViewpointLayer,
  viewDirectionKeyFromFeatures,
} from '@osm-editor-kit/street-imagery-react'
import type { MapGeoJSONFeature, MapLibreEvent } from 'maplibre-gl'
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
import { SelectedFeatureLayer } from '@/features/map/SelectedFeatureLayer'
import { signGroupFilter } from '@/features/map/signGroupFilter'
import {
  geometryLines,
  joinStreetFragments,
  STREET_HIT_LAYER_ID,
  STREET_SOURCE_ID,
  STREET_SOURCE_LAYER,
} from '@/features/map/streetLines'
import { StreetLinesLayer } from '@/features/map/StreetLinesLayer'
import { SyncMapCameraFromUrl } from '@/features/map/SyncMapCameraFromUrl'
import {
  getMapFeatureStyleDefinition,
  getStyleDefinition,
} from '@/features/styles/styleDefinitions'
import { useSelectedPhotoForMap } from '@/features/viewer/useSelectedPhotoForMap'
import { useViewpointPhotos } from '@/features/viewer/useViewpointPhotos'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const isNearZeroAngle = (value: number) => Math.abs(value) < 0.05

/** Line piece of a (multi)line feature closest to the click. */
const closestLine = (feature: MapGeoJSONFeature, click: LngLat): LngLat[] | null => {
  let best: { line: LngLat[]; distance: number } | null = null
  for (const line of geometryLines(feature.geometry)) {
    const snapped = snapToLine(line, click)
    if (!snapped) {
      continue
    }
    const distance = Math.hypot(snapped.point[0] - click[0], snapped.point[1] - click[1])
    if (!best || distance < best.distance) {
      best = { line, distance }
    }
  }
  return best?.line ?? null
}

export { MAIN_MAP_ID } from '@/features/map/constants'

export const MapRoot = () => {
  const { map, search, updateMapViewport, updateSearch } = useAppSearchNavigation()
  const { providers, style, photoTypes, date, signGroups } = search
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const { selectedPhoto, selectedSequenceId, viewerPov } = useSelectedPhotoForMap()
  const [cursor, setCursor] = useState('grab')
  const [hoveredStreet, setHoveredStreet] = useState<LngLat[] | null>(null)
  const { viewpointsEnabled, viewpoints, suggestions, activeDirectionKey, selectSuggestion } =
    useViewpointPhotos()
  const viewpointLine = useViewpointLine()
  const { markMapLoaded } = useMapActions()
  const pickingLocation = useArmedLocationOpenerId() != null

  const styleDefinition = getStyleDefinition(style)
  const mapFeatureStyleDefinition = getMapFeatureStyleDefinition(style)

  const interactiveLayerIds = viewpointsEnabled
    ? [
        VIEWPOINT_DIRECTION_LAYER_ID,
        ...streetImageryInteractiveLayerIds(providers),
        STREET_HIT_LAYER_ID,
      ]
    : streetImageryInteractiveLayerIds(providers)
  const hasClickOnlyProvider = providers.some((providerId) => isClickOnlyPhotoProvider(providerId))

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

  const handleClick = (event: MapLayerMouseEvent) => {
    // This click opens the place in another service (LocationPickOnMap); keep the selection.
    if (pickingLocation) {
      return
    }
    const features = event.features ?? []
    const clickPoint = {
      lng: Math.round(event.lngLat.lng * 1e6) / 1e6,
      lat: Math.round(event.lngLat.lat * 1e6) / 1e6,
    }
    const click: LngLat = [clickPoint.lng, clickPoint.lat]
    const { actions } = getViewpointSession()

    // 1. A suggested view direction of the current viewpoints.
    const directionKey = viewDirectionKeyFromFeatures(features)
    const suggestion = suggestions.find((s) => s.direction.key === directionKey)
    if (suggestion) {
      selectSuggestion(suggestion)
      return
    }

    // 2. A map feature (sign, object): select it; the viewer shows its photos turned to it.
    const mapFeature = queryStreetImageryFeatures(event).find((hit) => hit.kind === 'mapFeature')
    if (mapFeature?.featureId) {
      actions.close()
      // Clicking the selected feature again keeps the photo that is shown.
      const sameFeature = search.feature === mapFeature.featureId
      updateSearch(
        sameFeature
          ? { clicked: clickPoint }
          : { clicked: clickPoint, selected: undefined, feature: mapFeature.featureId },
        { replace: true },
      )
      return
    }

    // 3. A photo dot: show that photo, without suggested views. The larger view-direction
    //    halos around photos only count when no street is under the pointer.
    const street = features.find((feature) => feature.layer?.id === STREET_HIT_LAYER_ID)
    const hitPhotoDot = features.some((feature) => feature.layer?.id.startsWith('photos-'))
    const photo =
      hitPhotoDot || !street
        ? queryStreetImageryFeatures(event).find((hit) => hit.kind === 'photo')
        : undefined
    if (photo?.photoId) {
      actions.close()
      updateSearch(
        {
          clicked: clickPoint,
          selected: {
            provider: photo.providerId,
            sequenceId: photo.sequenceId,
            photoId: photo.photoId,
          },
          feature: undefined,
        },
        { replace: true },
      )
      return
    }

    // 4. A street: viewpoints at its start, the click and its end, looking along the street.
    const clickedLine = street ? closestLine(street, click) : null
    if (street && clickedLine) {
      const fragments = event.target
        .querySourceFeatures(STREET_SOURCE_ID, {
          sourceLayer: STREET_SOURCE_LAYER,
          filter: ['==', ['get', 'class'], street.properties?.class ?? ''],
        })
        .flatMap((feature) => geometryLines(feature.geometry))
      const line = joinStreetFragments(clickedLine, fragments)
      actions.open({ viewpoints: viewpointsFromLine(line, click), line })
      updateSearch(
        { clicked: clickPoint, selected: undefined, feature: undefined },
        { replace: true },
      )
      return
    }

    // 5. Anywhere else: one viewpoint looking in all four directions (Mapillary). Without
    //    Mapillary, only click-only providers (Look Around, Street View) need the click point.
    if (viewpointsEnabled) {
      actions.open({ viewpoints: [viewpointFromPoint(click)] })
    } else if (features.length === 0 && !hasClickOnlyProvider) {
      updateSearch(
        { clicked: undefined, selected: undefined, feature: undefined },
        { replace: true },
      )
      return
    }
    updateSearch(
      { clicked: clickPoint, selected: undefined, feature: undefined },
      { replace: true },
    )
  }

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const features = event.features ?? []
    setCursor(features.length ? 'pointer' : 'grab')
    const street = features.some((f) => f.layer?.id.startsWith('photos-'))
      ? undefined
      : features.find((f) => f.layer?.id === STREET_HIT_LAYER_ID)
    setHoveredStreet(street ? closestLine(street, [event.lngLat.lng, event.lngLat.lat]) : null)
  }

  const handleMouseLeave = () => {
    setCursor('grab')
    setHoveredStreet(null)
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
      cursor={pickingLocation ? 'crosshair' : cursor}
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
      {viewpointsEnabled ? <StreetLinesLayer hovered={hoveredStreet} /> : null}
      <LocationPickOnMap />
      <StreetLevelImagerySourcesAndLayers
        bbox={bbox}
        filter={{ photoTypes, date, mapFeatureValue: signGroupFilter(signGroups) }}
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
      <SelectedFeatureLayer />
      {viewpointsEnabled ? (
        <ViewpointLayer
          activeDirectionKey={activeDirectionKey}
          line={viewpointLine}
          suggestions={suggestions}
          viewpoints={viewpoints}
          zoom={map.zoom}
        />
      ) : null}
    </Map>
  )
}
