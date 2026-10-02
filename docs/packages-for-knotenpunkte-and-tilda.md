# Using the street-imagery packages in Knotenpunkte and tilda-geo

Status 2026-10-02. Packages: `@osm-editor-kit/street-imagery` 0.1.0-alpha.4 (pure TypeScript) and
`@osm-editor-kit/street-imagery-react` 0.1.0-alpha.5 (React, react-map-gl, MapLibre 6), source in
`OSM/street-space-editor/packages/`. This app is the test bed for both.

Much of the Mapillary logic comes from the iD Radnetz fork (`iD--radnetz-berlin/WORKDOC.md`,
features 18, 19, 26). What stayed in iD: the OSM tag fields and the buttons that write tags.

## Setup in a host app

```bash
bun add @osm-editor-kit/street-imagery@alpha @osm-editor-kit/street-imagery-react@alpha
```

```ts
// Once at boot. Each app registers its own Mapillary client token.
setStreetImageryConfig(createStreetImageryConfig({ mapillaryToken: MAPILLARY_TOKEN }))
```

```css
/* Tailwind does not scan node_modules. */
@source '../node_modules/@osm-editor-kit/street-imagery-react';
```

MapLibre 6 needs its worker set up once (`setWorkerUrl`, see `src/features/map/maplibre-worker.ts`
here; Knotenpunkte already has this).

## Knotenpunkte: plan phases → package API

The plan is `FMC/knotenpunkte/MAPILLARY-PLAN.md`.

### Phase 1 — photo viewer next to the form, turned to the node

| Need                                          | API                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Photos near the node                          | `fetchMapillaryImagesNearPoint(node)` (≤ 50 images within 50 m), or `useViewSuggestions`                                                   |
| One view per approaching street, looking in   | `viewpointsIntoNode(node, approachLines, { distanceMeters: 20 })` → `useViewSuggestions(viewpoints, { maxAgeYears: 2 })`                   |
| Draw the predefined viewpoints                | `<ViewpointLayer viewpoints suggestions activeDirectionKey zoom />`, clickable via `VIEWPOINT_DIRECTION_LAYER_ID`                          |
| Viewer turned to the node                     | `<StreetLevelImageryViewer photo lookAt={{ lngLat: node, shape: PLACE_TARGET }} />` (360° and flat photos)                                 |
| Floating box with chips and history           | `<FloatingPhotoViewer>` + `getViewpointSession()`                                                                                          |
| "Dieses Foto übernehmen"                      | `onViewerPhoto` gives the shown photo; write `photo.photoId` into `Mapillary-ID`                                                           |
| Nodes without recent photos get another color | no chip has a candidate: `suggestions.every((s) => s.candidates.length === 0)`                                                             |
| Age colors, own captures                      | `ageBandColorExpression(cutoff, now)`; `photo.creatorId` / `organizationId` + `createMapillaryHighlightResolver` (`radinfra`, `fixmycity`) |

The approach lines come from Knotenpunkte's street data; their direction does not matter.

### Phase 2 — detected features around the node

| Need                                                           | API                                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Features within ~40 m                                          | `useMapillaryMapFeaturesNear(node, { radiusMeters: 40, objectValues })` (Graph API, has `facing`)                                                  |
| The five groups, counts per attribute                          | `JUNCTION_FEATURE_GROUPS`, `countByGroup(features, JUNCTION_FEATURE_GROUPS)` → "3 Ampeln"                                                          |
| Features as a map layer                                        | `StreetLevelImagerySourcesAndLayers` with provider `mapillary-map-features` and `filter.mapFeatureValue: matchesAnyGroup(JUNCTION_FEATURE_GROUPS)` |
| Click a count → best photo of that feature, turned to it       | `useMapillaryMapFeatureImages(featureId)` → `days[0].best`, then `lookAt={{ lngLat: feature.lngLat, value: feature.value }}`                       |
| Only bike-lane, symbol, stop-line, line outlines in the viewer | `useMapillaryImageDetections(photoId, { filter: matchesAnyGroup(JUNCTION_DETECTION_GROUPS), filterKey })` → `outlines`                             |

### Phase 3 — `LSA_KP` suggestions (script, no React)

The core package runs in Bun/Node: `fetchMapillaryMapFeaturesInBbox(bboxAround(node, 30), { objectValues: ['object--traffic-light--*'] })`.
Checked live: Moritzplatz (no signals) has few, Kottbusser Tor has 236 traffic lights within 60 m.
Limits: search API 10,000 requests per minute.

### Phase 4 — red marking experiment

`fetchImageDetections(imageId, { filter })` gives the `construction--flat--bike-lane` outlines in
image coordinates (0…1). Reading the pixels inside is not part of the packages. Mapillary itself
has no colour attribute.

## tilda-geo

- **Images of a feature**: `mapillaryImagesOfTags(tags)` lists every image id in the OSM tags with a
  label ("Right bike lane · traffic sign (source)"); `preferredMapillaryImageId(tags)` picks the one
  to show first. Same key grammar as TILDA's `extract_bikelanes.lua`.
- **Photos along a clicked line**: `viewpointsFromLine(line, click)` → start, click point, end, each
  forward and back.
- **Details per image**: `fetchMapillaryImages(ids)` (date, 360°, username), `formatRelativeAge`.
- tilda-geo is on MapLibre 6.4; the React package needs MapLibre 6.

## Street View and Infra3D (next)

- Suggested views take `sources`: `useViewSuggestions(viewpoints, { sources: [mapillaryPhotoSource, streetViewPhotoSource] })`.
  `streetViewPhotoSource` uses the free metadata API and needs `googleMapsApiKey` in the config
  (a constant in the host app, not `.env`).
- Still to build for Street View: the viewer panel (`google.maps.StreetViewPanorama`) for the
  floating box. See `docs/viewpoint-photo-finder-plan.md`, section 7, incl. the terms-of-service note.
- Infra3D: write a `ViewpointPhotoSource` (`{ id: 'infra3d', fetchNear }`) in the host app or the
  package, plus a viewer panel. The provider list (`PROVIDER_IDS`) has no `infra3d` entry yet; it
  needs one for map layers and the URL state. Open: Infra3D's API and access.

## Not in the packages

- Writing OSM tags from a photo or sign (iD's sign bar): stays in iD.
- German sign meanings (`DE:237` for `bicycles-only`): stays in iD until it moves into the traffic
  sign tool's country data.
- Reading pixel colours inside outlines (Knotenpunkte phase 4).
