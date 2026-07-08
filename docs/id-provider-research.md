# iD Street-Level Imagery Provider Integration Reference

> Extracted from the iD editor source (`/Users/tordans/Development/OSM/iD`) as the spec for this app's provider adapters.

Primary files:

- Services: `modules/services/{mapillary,panoramax,kartaview,mapilio,streetside,vegbilder}.js`
- Map layers: `modules/svg/{mapillary_images,mapillary_signs,mapillary_map_features,panoramax_images,kartaview_images,mapilio_images,streetside,vegbilder}.js`
- Shared filters: `modules/renderer/photos.js`, `modules/ui/sections/photo_overlays.js`
- Viewers: `modules/ui/photoviewer.js`, `modules/services/{pannellum_photo,plane_photo}.js`

---

## Cross-cutting patterns (all providers)

### Spatial caching

- **RBush** r-tree per provider; points indexed as `{ minX, minY, maxX, maxY, data }`.
- Tile/request dedup: `requests.loaded[tileId]` + `requests.inflight[tileId]` with `AbortController`.
- Visible results capped via **`searchLimited(limit=5, projection, rtree)`** (`modules/util/partition.ts`): viewport split into partitions, max 5 hits per partition.
- Panoramax uses a custom variant with spacing/down-sampling (`modules/services/panoramax.js` `searchLimited`).

### Global UI filters (`modules/renderer/photos.js`)

| Filter                | Storage                     | URL hash key          |
| --------------------- | --------------------------- | --------------------- |
| `fromDate` / `toDate` | ISO `YYYY-MM-DD` strings    | `photo_dates=from_to` |
| `usernames`           | comma/semicolon-split array | `photo_username`      |
| `flat` / `panoramic`  | `_shownPhotoTypes`          | `photo_type`          |
| Deep-link photo       | —                           | `photo=provider/id`   |

Date slider shown when any of: mapillary, kartaview, mapilio, streetside, vegbilder, panoramax.

Username filter shown when: `(kartaview only, no mapillary/streetside) OR panoramax` — see `photos.shouldFilterByUsername()`.

### Map display zoom thresholds (SVG layers)

| Provider                 | Layer loads data            | Markers      | Viewfields (heading wedges) |
| ------------------------ | --------------------------- | ------------ | --------------------------- |
| Mapillary                | z ≥ 12                      | z ≥ 16       | z ≥ 18                      |
| Mapillary signs/features | z ≥ 12                      | icons always | —                           |
| Panoramax                | lines z ≥ 10, images z ≥ 15 | z ≥ 15       | z ≥ 18                      |
| KartaView                | z ≥ 12                      | z ≥ 16       | z ≥ 18                      |
| Mapilio                  | lines z ≥ 10, images z ≥ 16 | z ≥ 16       | z ≥ 18                      |
| Streetside               | z ≥ 14                      | z ≥ 16       | z ≥ 18                      |
| Vegbilder                | z ≥ 14                      | z ≥ 16       | z ≥ 18                      |

---

## 1. Mapillary

**Files:** `modules/services/mapillary.js`, `modules/svg/mapillary_images.js`, `modules/svg/mapillary_signs.js`, `modules/svg/mapillary_map_features.js`, `modules/svg/mapillary_position.js`

### 1.1 API endpoints & fetch method

| Purpose                   | Exact URL / pattern                                                                                                                   | Method                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Access token (embedded)   | `MLY\|4100327730013843\|5bb78b81720791946a9a7b956c57b7cf`                                                                             | query param `access_token` |
| Graph API base            | `https://graph.mapillary.com/`                                                                                                        | REST (not GraphQL)         |
| Image vector tiles        | `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=MLY\|4100327730013843\|5bb78b81720791946a9a7b956c57b7cf` | MVT fetch → `arrayBuffer`  |
| Traffic-sign tiles        | `https://tiles.mapillary.com/maps/vtp/mly_map_feature_traffic_sign/2/{z}/{x}/{y}?access_token=...`                                    | MVT                        |
| Map-feature (point) tiles | `https://tiles.mapillary.com/maps/vtp/mly_map_feature_point/2/{z}/{x}/{y}?access_token=...`                                           | MVT                        |
| Detections per image      | `https://graph.mapillary.com/{imageId}/detections?access_token=...&fields=id,image,geometry,value`                                    | REST JSON                  |
| Detections (generic)      | `https://graph.mapillary.com/{id}/detections?access_token=...&fields=id,value,image`                                                  | REST JSON                  |

**Tile fetch:** `utilTiler().zoomExtent([14, 14]).skipNullIsland(true)` — fixed zoom **14** for all three tile types.

**Viewer SDK assets:** `mapillary-js/mapillary.css`, `mapillary-js/mapillary.js` (bundled in iD).

### 1.2 Data model

#### Images (MVT layer `image`)

| iD field      | MVT property    | Notes        |
| ------------- | --------------- | ------------ |
| `id`          | `id`            | numeric      |
| `sequence_id` | `sequence_id`   | string       |
| `captured_at` | `captured_at`   | epoch ms     |
| `ca`          | `compass_angle` | heading      |
| `is_pano`     | `is_pano`       | boolean      |
| `loc`         | geometry        | `[lng, lat]` |

Cached in `_mlyCache.images.forImageId` + `images.rtree`.

#### Sequences (MVT layer `sequence`)

- Stored as array of GeoJSON features per `properties.id` in `_mlyCache.sequences.lineString[id]`.
- Used to draw path lines for sequences visible in viewport.

#### Traffic signs (MVT layer `traffic_sign`)

| iD field        | MVT property                                    |
| --------------- | ----------------------------------------------- |
| `id`            | `id`                                            |
| `first_seen_at` | `first_seen_at`                                 |
| `last_seen_at`  | `last_seen_at`                                  |
| `value`         | `value` (sprite id, e.g. `regulatory--stop--*`) |
| `loc`           | geometry                                        |

#### Map features (MVT layer `point`)

Same shape as signs (`id`, `first_seen_at`, `last_seen_at`, `value`, `loc`). `value` like `object--sign--advertisement`.

#### Detections (REST, for viewer overlays)

`{ id, image: { id }, geometry (base64 MVT), value }` — geometry decoded from layer `mpy-or`.

### 1.3 Photo viewer

- **SDK:** `mapillary.Viewer` (mapillary-js) in container `#ideditor-mly`.
- **Options:** `accessToken` above; components: `cover:false`, `keyboard:false`, `tag:true`.
- **WebGL fallback:** if unsupported, disables direction/sequence/tag; keeps `image` + `navigation`.
- **Image selection:** `_mlyViewer.moveTo(imageId)`.
- **Sequence navigation:** built into mapillary-js `sequence` component (not custom prev/next buttons).
- **Active image:** `{ id, ca, loc, is_pano, sequence_id }` from viewer `image` event.
- **Hash:** `photo=mapillary/{id}`.
- **Map sync:** centers map on `image.originalLngLat`; viewfield on map rotates via `bearing` event (`mapillary_position.js`).

### 1.4 Date & username filtering

**Map markers** (`mapillary_images.js`):

- `fromDate`: `captured_at >= fromDate`
- `toDate`: `captured_at <= toDate`
- Photo type: filter `is_pano` vs flat

**Signs / map features** (`mapillary_signs.js`, `mapillary_map_features.js`):

- `fromDate`: `last_seen_at >= fromDate`
- `toDate`: `first_seen_at <= toDate`

**Viewer filter** (`filterViewer`):

```javascript
['all',
 !showsPano ? ['!=', 'cameraType', 'spherical'] : ...,
 !showsFlat && showsPano ? ['==', 'pano', true] : ...,
 fromDate ? ['>=', 'capturedAt', ...] : ...,
 toDate ? ['>=', 'capturedAt', ...] : ...] // NOTE: toDate uses >= not <= (likely bug)
```

**No username filter** for Mapillary.

### 1.5 Quirks

- Tile version path `/2/` in all Mapillary tile URLs.
- Signs/features click → `getDetections(id)` → opens linked image in viewer with `OutlineTag` overlays.
- Sprites: `mapillary-sprite`, `mapillary-object-sprite` from `@rapideditor/mapillary_sprite_source`.
- `skipNullIsland(true)` on tiler.
- Service min tile zoom **14**; SVG layer min **12** (loads tiles only when z≥12 but tiles are z14 data).

---

## 2. Panoramax

**Files:** `modules/services/panoramax.js`, `modules/svg/panoramax_images.js`

**Traffic signs:** **Not implemented** in iD (no signs layer or API calls).

### 2.1 API endpoints

| Purpose                     | Exact URL                                                                   | Method   |
| --------------------------- | --------------------------------------------------------------------------- | -------- |
| API base                    | `https://api.panoramax.xyz/`                                                | —        |
| Vector tiles                | `https://api.panoramax.xyz/api/map/{z}/{x}/{y}.mvt`                         | MVT      |
| Collection items (sequence) | `https://api.panoramax.xyz/api/collections/{collectionId}/items?limit=1000` | GET JSON |
| Single item                 | `https://api.panoramax.xyz/api/collections/{collectionId}/items/{itemId}`   | GET JSON |
| User search                 | `https://api.panoramax.xyz/api/users/search?q={username}`                   | GET JSON |
| User by id                  | `https://api.panoramax.xyz/api/users/{userId}`                              | GET JSON |
| External viewer link        | `https://api.panoramax.xyz/#pic={id}&focus=pic`                             | —        |

**Tile zoom:** `utilTiler().zoomExtent([10, maxZoom])` where `maxZoom` = **15** for images, **10** for lines. Constants: `minZoom=10`, `imageMinZoom=15`, `lineMinZoom=10`.

### 2.2 Data model

#### Images (MVT layer `pictures`)

| iD field       | MVT property                 | Notes                                        |
| -------------- | ---------------------------- | -------------------------------------------- |
| `id`           | `id`                         |                                              |
| `sequence_id`  | `first_sequence`             | collection id                                |
| `capture_time` | `ts`                         | ISO string; also `capture_time_parsed` Date  |
| `heading`      | `heading`                    | parsed int                                   |
| `isPano`       | `type === 'equirectangular'` |                                              |
| `account_id`   | `account_id`                 | for username filter                          |
| `model`        | `model`                      |                                              |
| `image_path`   | _(filled later)_             | from REST `assets.sd` or `assets.hd` `.href` |
| `loc`          | geometry                     | `[lng, lat]`                                 |

#### Sequences (MVT layer `sequences`)

- Features keyed by `properties.id`; at zoom 10–14 stored in `mockSequences` (coarse lines), at z≥15 in `sequences`.
- Sequence properties used in filters: `type`, `date`, `account_id`.

#### REST item shape (for viewer)

- `assets.sd` / `assets.hd` — image URLs
- `links[]` with `rel: 'next' | 'prev'` and `id` for sequence navigation

### 2.3 Photo viewer

- **Not** mapillary-js. Uses shared frames:
  - **Pano:** `pannellumPhotoFrame` — equirectangular, `northOffset: data.ca`
  - **Flat:** `planePhotoFrame` — `<img>` + d3-zoom pan/zoom
- HD toggle: checkbox switches `_definition` between `'sd'` and `'hd'`.
- **Prev/next:** buttons call `data.links` `prev`/`next` → `selectImage(nextId)`; buttons hidden when link null.
- **Hash:** `photo=panoramax/{id}`
- Viewfield on map rotates with pannellum yaw for active image.

### 2.4 Date & username filtering

**Images:**

- `capture_time >= fromDate`, `capture_time <= toDate`
- `isPano` vs flat via `showsPanoramic` / `showsFlat`

**Username** (`panoramax_images.js`):

1. `getUserIds(usernames)` → `GET api/users/search?q={username}`
2. Match `features[].name === username` → collect `features[].id`
3. Filter images where `account_id` in resolved ids
4. Same username can map to **multiple ids** (multi-server)

**Sequences:** filter by `properties.date`, `properties.type`, `properties.account_id`.

### 2.5 Quirks

- Custom `searchLimited` down-samples dense tiles (keeps active image).
- `getImageData` primes cache from whole collection; single-item fallback because `withPicture` param is buggy (issue #268).
- Empty MVT (`byteLength === 0`) treated as no data.
- Sort markers by capture time (newest on top); active image forced to top.

---

## 3. KartaView (OpenStreetCam)

**Files:** `modules/services/kartaview.js`, `modules/svg/kartaview_images.js`

### 3.1 API endpoints

| Purpose       | Exact URL                                       | Method                                       |
| ------------- | ----------------------------------------------- | -------------------------------------------- |
| API base      | `https://kartaview.org`                         | —                                            |
| Nearby photos | `https://kartaview.org/1.0/list/nearby-photos/` | **POST** `application/x-www-form-urlencoded` |

**POST body** (`utilQsString`):

```
ipp=1000
page={n}
bbTopLeft={maxY},{minX}      // lat,lng of NW corner
bbBottomRight={minY},{maxX}  // lat,lng of SE corner
```

(`client_id` commented out.)

**Image URL:** `https://kartaview.org/{imagePath}` rewritten to:
`https://storage{N}.openstreetcam.org/...` when path matches `/storage(\d+)/`.

**Tile scheme:** fixed zoom **14** tiles via `utilTiler().zoomExtent([14,14])`.

**Pagination:** `maxPageAtZoom(z)`: z<15→2, 15→5, 16→10, 17→20, 18→40, z>18→80 pages per tile. Stops when page returns `< 1000` items.

### 3.2 Data model

From `currentPageItems[]`:

| iD field         | API field                   |
| ---------------- | --------------------------- |
| `key`            | `id`                        |
| `sequence_id`    | `sequence_id`               |
| `sequence_index` | `sequence_index` (int)      |
| `ca`             | `heading`                   |
| `captured_at`    | `shot_date` or `date_added` |
| `captured_by`    | `username`                  |
| `imagePath`      | `name`                      |
| `loc`            | `[+lng, +lat]`              |

Sequences: `_oscCache.sequences[sequence_id] = { rotation: 0, images: [] }` — sparse array indexed by `sequence_index`.

**No `is_pano` / `pano` set** in service (viewfield pano circle in `setStyles` never triggers).

### 3.3 Photo viewer

- **Plain `<img>`** in `.kartaview-image-wrap` with d3-zoom pan (extent 320×240, scale 1–15).
- **Rotation:** per-sequence `sequence.rotation` ±90° buttons (not heading-based).
- **Prev/next:** `sequence_index ± 1` → `selectImage(nextImage.key)`.
- **Hash:** `photo=kartaview/{key}`
- External link: `https://kartaview.org/details/{sequence_id}/{sequence_index}`

### 3.4 Date & username filtering

(`kartaview_images.js`):

- `captured_at >= fromDate`, `captured_at <= toDate`
- `captured_by` must be in `usernames` array (exact match)
- **No flat/pano type filter** for KartaView

### 3.5 Quirks

- Aborts inflight requests for tiles no longer in view.
- Inflight keyed as `tileId,page`.
- Username filter UI only when KartaView is sole street-level layer (see global rules).
- Legacy hash alias: `openstreetcam` → `kartaview`.

---

## 4. Mapilio

**Files:** `modules/services/mapilio.js`, `modules/svg/mapilio_images.js`

### 4.1 API endpoints

| Purpose          | Exact URL                                                                                                                                                                                                                                              | Method   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| API base         | `https://end.mapilio.com`                                                                                                                                                                                                                              | —        |
| Image CDN        | `https://cdn.mapilio.com/im`                                                                                                                                                                                                                           | —        |
| Point WMTS tiles | `https://geo.mapilio.com/geoserver/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=mapilio:map_points&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}` | MVT      |
| Line WMTS tiles  | same with `LAYER=mapilio:map_roads_line`                                                                                                                                                                                                               | MVT      |
| Sequence detail  | `https://end.mapilio.com/api/sequence-detail?sequence_uuid={sequenceId}`                                                                                                                                                                               | GET JSON |
| User lookup      | `https://end.mapilio.com/api/search-user?options[parameters][id]={userId}`                                                                                                                                                                             | GET JSON |

**Tile zoom:** fixed **14** (`minZoom = 14`). Layers: `map_points`, `map_roads_line`.

**Image URL pattern:**
`https://cdn.mapilio.com/im/{uploaded_hash}/{filename}/{resolution}`

- `resolution`: **1080** (default) or **2080** (HD checkbox)

### 4.2 Data model

#### Points (MVT layer `map_points`)

| iD field        | MVT property    | Notes                       |
| --------------- | --------------- | --------------------------- |
| `id`            | `id`            | numeric                     |
| `sequence_id`   | `sequence_uuid` |                             |
| `capture_time`  | `capture_time`  |                             |
| `heading`       | `heading`       |                             |
| `created_by_id` | `created_by_id` |                             |
| `resolution`    | `resolution`    | e.g. `1920x1080`            |
| `isPano`        | derived         | `max(w,h) % min(w,h) === 0` |
| `loc`           | geometry        |                             |

#### Lines (MVT layer `map_roads_line`)

- Keyed by `sequence_uuid`; **deduplicated** with `deepEqual` on coordinates (issue #10532).

#### Sequence detail response

`data.data[]` with `{ id, filename, uploaded_hash }` matched by image id.

### 4.3 Photo viewer

- **Pano:** Pannellum in `#ideditor-viewer-mapilio-pnlm` (`pannellum/pannellum.js`).
- **Flat:** `<img>` in `#ideditor-viewer-mapilio-simple` with d3-zoom.
- HD checkbox toggles resolution segment in CDN URL.
- **Prev/next:** `id ± 1` lookup in `forImageId` cache (numeric adjacency, not sequence order):

  ```javascript
  const nextIndex = imageId + stepBy
  const nextImage = _cache.images.forImageId[nextIndex]
  ```

  Buttons hidden via `hasOwnProperty(+id ± 1)`.

- **Hash:** `photo=mapilio/{id}`
- External: `https://mapilio.com/app?lat=...&lng=...&zoom=17&pId={id}`

### 4.4 Date & username filtering

- **Date:** `capture_time >= fromDate`, `capture_time <= toDate` (images + line `properties.capture_time`)
- **No username filter** in iD (username fetched only for attribution via `created_by_id`)
- **No flat/pano filter** in SVG layer

### 4.5 Quirks

- WMTS uses `TILEROW`/`TILECOL` (GeoServer GWC), EPSG:900913 matrix.
- Pannellum scenes created/destroyed per image; keeps max 2 scenes.
- `capture_time_parsed` referenced in sort but never set (sort may be NaN).
- Line + image tiles both loaded at z≥10; images only displayed at z≥16.

---

## 5. Streetside (Microsoft Bing)

**Files:** `modules/services/streetside.js`, `modules/svg/streetside.js`

### 5.1 API endpoints

| Purpose      | Exact URL                                                                                                                                                                                                   | Method   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Metadata API | `https://dev.virtualearth.net/REST/v1/Imagery/MetaData/Streetside?mapArea={bbox}&key={key}&count={count}&uriScheme=https`                                                                                   | GET JSON |
| API key      | AES-encrypted hex in source: `5c875730b09c6b422433e807e1ff060b6536c791dbfffcffc4c6b18a1bdba1f14593d151adb50e19e1be1ab19aef813bf135d0f103475e5c724dec94389e45d0` → decrypted at runtime via `utilAesDecrypt` | —        |

**Query params:**

- `{bbox}` = `south,west,north,east` from tile rectangle: `[rect[1], rect[0], rect[3], rect[2]]`
- `{count}` = **500** (`maxResults`)

**Bubble image URL template** (from API `imageUrl`):

- Replace `{subdomain}` → `imageUrlSubdomains[0]`
- Replace `{faceId}` → `01|02|03|10|11|12` (cubemap faces)
- Replace `{tileId}` → quadkey string

**Tile scheme:** fixed zoom **16.5** (`tileZoom = 16.5`). Default **margin = 2** tiles around viewport.

### 5.2 Data model

From `resourceSets[0].resources[]` (bubble):

| iD field      | API field                       | Notes                     |
| ------------- | ------------------------------- | ------------------------- |
| `key`         | `imageUrl`                      | bubble id                 |
| `imageUrl`    | `imageUrl`                      | template URL              |
| `loc`         | `lon/longitude`, `lat/latitude` | `[lng, lat]`              |
| `ca`          | `he` or `heading`               |                           |
| `captured_at` | `vintageEnd`                    |                           |
| `captured_by` | hardcoded `'microsoft'`         |                           |
| `pano`        | hardcoded `true`                |                           |
| `sequenceKey` | always `null`                   | sequences never populated |

**Dedup:** `cache.points[bubbleId]` — skip if already cached.

**Overflow:** if response length === 500, tile extent split into 4 sub-tiles and re-fetched.

### 5.3 Photo viewer

- **Pannellum cubemap** (`type: 'cubemap'`) in `#ideditor-viewer-streetside`.
- **Stitching pipeline:** for each of 6 faces, load many 256×256 tiles into hidden canvases (`#ideditor-canvas{face}`), composite to JPEG data URLs, assign to `_sceneOptions.cubeMap[0..5]`.
- Resolution: **512** default, **1024** with "hi-res" checkbox (`_resolution`).
- `northOffset = d.ca`; yaw preserved across same-sequence navigation.
- **Prev/next:** **no API sequence** — geometric search:
  - Build forward/backward trapezoid polygon (~35 m ahead)
  - Find nearest bubble in RBush inside polygon
  - Penalize +5 m if heading difference > 20°
  - Uses `selected.ne` / `selected.pr` if present (but never set in loader)
- **Hash:** `photo=streetside/{key}`

### 5.4 Date & username filtering

(`streetside.js` SVG):

- Only shown when `showsPanoramic()` (all bubbles are pano).
- `captured_at >= fromDate`, `captured_at <= toDate`
- Username filter checks `captured_by` (`'microsoft'`) — effectively useless unless user types `microsoft`
- Date slider ticks use `vintageStart` from sequences (sequences always empty)

### 5.5 Quirks

- `sequenceKey` always null → **sequence polylines never render** despite sequence UI code existing.
- `loadBubbles` aborts stale inflight requests on pan.
- Quadkey tables hardcoded for dim 2, 4, 8, 16 (512 vs 1024 resolution).
- Min zoom **14** for layer; tooltip references `street_side.minzoom_tooltip`.
- lon/lat fallback for API field name changes (issue #10341).

---

## 6. Vegbilder (Norwegian Public Roads Administration)

**Files:** `modules/services/vegbilder.js`, `modules/svg/vegbilder.js`

### 6.1 API endpoints

| Purpose      | Exact URL                                                                                                            | Method      |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| OWS endpoint | `https://www.vegvesen.no/kart/ogc/vegbilder_1_0/ows?`                                                                | —           |
| Capabilities | `?service=WFS&request=GetCapabilities&version=2.0.0`                                                                 | GET XML     |
| Features     | `?service=WFS&request=GetFeature&version=2.0.0&typenames={layer}&bbox={minY},{minX},{maxY},{maxX}&outputFormat=json` | GET GeoJSON |

**Layer names** (from capabilities regex):
`^vegbilder_1_0:Vegbilder(?<image_type>_360)?_(?<year>\d{4})$`

- `is_sphere` = `_360` present
- `year` = 4-digit year

**Tile scheme:** fixed zoom **14** tiles; default **margin = 1**.

**Geographic restriction:** `validHere()` — bbox must intersect Norway (`iso1A2Codes` includes `'NO'`). Layer shown in UI only when `validHere` passes (can appear greyed below z12).

### 6.2 Data model

#### WFS feature properties → iD object

| iD field         | WFS property          | Notes                                   |
| ---------------- | --------------------- | --------------------------------------- |
| `key`            | `feature.id`          |                                         |
| `ca`             | `RETNING`             | heading; may be computed from geometry  |
| `captured_at`    | `TIDSPUNKT`           | parsed as `Date`                        |
| `image_path`     | `URL`                 | full image URL                          |
| `preview_path`   | `URLPREVIEW`          | thumbnail                               |
| `is_sphere`      | `BILDETYPE === '360'` |                                         |
| `metering`       | `METER`               | chainage                                |
| `lane_code`      | `FELTKODE`            |                                         |
| `direction`      | derived from lane     | even lane → backward, odd → forward     |
| `road_reference` | computed              | from `FYLKENUMMER`, `VEGKATEGORI`, etc. |
| `loc`            | geometry.coordinates  | `[lng, lat]`                            |

**Sequences:** client-side only — grouped by `road_reference`, sorted by `captured_at` then `metering`, split when direction changes or gap > **20 seconds** (`20000` ms).

### 6.3 Photo viewer

- **Pano:** `pannellumPhotoFrame` (`type: 'equirectangular'`, `panorama: image_path`, `preview: preview_path`, `northOffset: ca`)
- **Flat:** `planePhotoFrame` (`<img src={image_path}>`)
- **Prev/next:** index in computed `sequence.images` array ±1; `keepOrientation` passed on step.
- **Hash:** `photo=vegbilder/{key}`
- External: `https://vegbilder.atlas.vegvesen.no/?year={year}&lat=...&lng=...&view=image&imageId={key}`

### 6.4 Date & username filtering

**Layer selection** (`filterAvailableLayers`):

- `year >= fromYear` (default fromYear **2016** if no fromDate)
- `year <= toYear` if toDate set
- Flat layers when `showsFlat`; `_360` layers when `showsPanoramic`

**Marker filter** (`vegbilder.js` SVG):

- `captured_at >= fromDate`, `captured_at <= toDate`
- `is_sphere` vs flat via photo type toggles

**No username filter.**

### 6.5 Quirks

- Multiple WFS layers (one per year × type) fetched in parallel per tile.
- On filter change, `loadImages(context)` re-called from SVG update to load newly eligible year layers.
- `orderSequences` computes missing `ca` from projected geometry bearing.
- WFS bbox order: `minY,minX,maxY,maxX` (lat,lon,lat,lon).
- `rendered` at z≥14; `validHere` at z ≥ 12.

---

## Shared viewer infrastructure

### `pannellumPhotoFrame` (`modules/services/pannellum_photo.js`)

- Container: `#ideditor-pannellum-viewer`
- Scene key = `data.image_path`
- Supports equirectangular (Panoramax, Vegbilder) — not used for Streetside cubemap (Streetside has own Pannellum instance).
- Keeps max **3** scenes; `keepOrientation` preserves yaw/pitch/hfov.

### `planePhotoFrame` (`modules/services/plane_photo.js`)

- `<img class="plane-photo">` with fit-to-view d3-zoom (scale min = fit, max = 4×).

### Hash deep-linking (`modules/renderer/photos.js`)

```
photo=provider/imageId
```

Waits up to **45 s** for `loadedImages` + `cachedImage(id)` before opening viewer.

---

## Implementation checklist for a meta-catalog React app

| Provider   | Index fetch              | Detail fetch               | Viewer tech         | Sequence nav               |
| ---------- | ------------------------ | -------------------------- | ------------------- | -------------------------- |
| Mapillary  | MVT z14 + token          | mapillary-js internal      | mapillary-js        | SDK sequence               |
| Panoramax  | MVT z10–15               | REST collection/items      | Pannellum / `<img>` | REST `links` prev/next     |
| KartaView  | REST bbox POST z14 tiles | image URL in list response | `<img>` + zoom      | `sequence_index ± 1`       |
| Mapilio    | WMTS MVT z14             | REST sequence-detail       | Pannellum / `<img>` | numeric `id ± 1` (fragile) |
| Streetside | REST bbox z16.5          | cubemap tile templates     | Pannellum cubemap   | geometric nearest bubble   |
| Vegbilder  | WFS per-year layers z14  | URLs in feature props      | Pannellum / `<img>` | client-built sequence      |

**Tokens to embed (from iD):**

- Mapillary: `MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf`
- Streetside: runtime-decrypted Bing key from AES blob above (same blob in `modules/renderer/background_source.js`)

**Not in iD:** Panoramax traffic signs; KartaView pano flag; Streetside sequence polylines (broken); Mapillary `toDate` viewer filter uses `>=`.

---

## Addendum (meta-catalog app research, 2026)

### Panoramax traffic signs (`panoramax-traffic-signs`)

**Skipped in v1.** Probed `https://api.panoramax.xyz/api/map/{z}/{x}/{y}.mvt` (Berlin z14 x8802 y5373): layers present were `sequences` only (no `pictures` at that tile/zoom; no traffic-sign or annotation layer). This matches iD, which has no Panoramax signs service or SVG layer. No documented public semantics/annotations MVT endpoint was found in the Panoramax API surface used by iD.

If Panoramax adds a signs/features MVT layer later, model it like Mapillary signs (`NormalizedMapFeature`, `last_seen_at` / `first_seen_at` date filter semantics).
