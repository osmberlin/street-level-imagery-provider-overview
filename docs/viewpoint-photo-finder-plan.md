# Viewpoints + floating photo viewer — plan (DRAFT for review)

Status: **draft v2 — questions answered (see “Decisions”), build in one go, review at the end**. Nothing implemented yet.

## Goal

Click the map (point or way) → the app places a **viewpoint** (a marker styled like a Mapillary
view-direction marker, but visually distinct) → it finds the **newest suitable photos** looking in
that direction → shows them in a **floating photo viewer on the map** (one box per provider) with
quick-switch between suggested views, plus back/forward history. Map and viewer stay in sync
both ways.

It is built here as a reusable package so we can use it in:

| App                       | Use case                                                                                       | Stack notes                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| this app                  | explore providers, click point/way                                                             | maplibre 5, react-map-gl 8, TanStack Router URL state    |
| `FMC/knotenpunkte`        | open/select a junction → predefined viewpoints on each approaching street, looking _into_ node | **maplibre 6**, react-map-gl 8, TanStack Router, zustand |
| `FMC/tilda-geo`           | photos for a clicked way/feature                                                               | maplibre 6.4 (in `app/`)                                 |
| `OSM/street-space-editor` | photos while editing ways                                                                      | hosts the `@osm-editor-kit/*` monorepo                   |

## Where the code lives

The packages already exist in `street-space-editor/packages/` (`@osm-editor-kit/street-imagery`
= framework-free core, `@osm-editor-kit/street-imagery-react` = React/maplibre layer). This repo
consumes them via a `file:` link (uncommitted migration in progress in the working tree).

Proposal:

1. **Core logic → `@osm-editor-kit/street-imagery`** (pure TS, no React, fully unit-tested):
   - `viewpoints/` — `Viewpoint` model, `viewpointsFromPoint`, `viewpointsFromLine`, `viewpointsIntoNode`
   - `photoFinder/` — score + rank photos for a viewpoint
2. **UI → `@osm-editor-kit/street-imagery-react`**: `ViewpointLayer`, `FloatingPhotoViewer`,
   `useViewpointSession` (store incl. history).
3. **App wiring stays in each app** (click handling, URL params, which geometry becomes viewpoints).

Develop in this repo against the linked packages, commit the package changes in
street-space-editor. (See Q1.)

## 1. Data model

```ts
type Viewpoint = {
  id: string
  lngLat: [number, number]
  /** Map bearing in degrees; null = undirected (point click). */
  bearing: number | null
  /** Why it exists, drives icons + grouping in the viewer. */
  role: 'here' | 'line-start' | 'line-end' | 'into-node' | 'custom'
  label?: string
}

type ViewDirection = {
  viewpointId: string
  bearing: number
  kind: 'forward' | 'back' | 'N' | 'E' | 'S' | 'W' | 'into'
}

type PhotoCandidate = {
  photo: NormalizedPhoto
  direction: ViewDirection
  score: number
  distanceM: number
  angleDiff: number
}
```

A viewpoint yields one or more **view directions**; each direction gets a ranked photo list per
provider; the top photo is auto-selected.

## 2. Generating viewpoints

| Trigger                     | Viewpoints                                                                                                                                            | Directions per viewpoint                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Click on empty map          | 1 × `here`, undirected                                                                                                                                | N / E / S / W                                            |
| Click on a way              | `here` (snapped to the line, bearing = line bearing at click), `line-start`, `line-end` (geometry end) → 3 viewpoints (no viewport clipping, decided) | forward (along line) + back (reverse)                    |
| Knotenpunkte: node selected | 1 per approaching way: point ~15–25 m up the way from the node, bearing toward the node (app precomputes; user clicks to open)                        | `into` (+ optional `out`)                                |
| Programmatic (any app)      | whatever the app passes                                                                                                                               | derived from `bearing` (directed → forward/back, else 4) |

Geometry helpers (bearing along line at a distance, clip to viewport bbox, offset along line) —
check `@osm-editor-kit/osm-way-chain` / `osm-route-snapper` for reusable bits before writing new ones;
otherwise small turf-free helpers in core.

Line "start" photo looks forward along the line; "end" photos look back toward the line. For each
point we show both "into the segment" and "out of it" as the transcript asks.

## 3. Finding photos (Mapillary first)

**Query:** Mapillary Graph API `GET /images?bbox=…&fields=id,computed_compass_angle,compass_angle,captured_at,computed_geometry,is_pano,sequence&start_captured_at=<now−N years>&limit=…`
around each viewpoint (radius ~30–50 m). Alternative: reuse the existing MVT tile path (`fetchMvt` +
`tileCache`, z14 `image` layer has `compass_angle`, `captured_at`, `is_pano`) — cheaper, cached, no
per-click API calls. **Proposal: reuse tiles**, fall back to Graph API only for details.

**Filter:** `captured_at >= now − maxAgeYears` (Knotenpunkte: 2 years; default configurable).

**Score** (per direction):

- angle between photo heading and desired bearing (flat: must be ≤ ~45°; pano: any heading OK, we
  set the viewer yaw to the desired bearing)
- distance to viewpoint (and for directed views: photo should be _behind_ the viewpoint, not past it)
- recency (newest wins among good matches)
- prefer panos slightly? (Q5)

Output: top N per direction, top 1 auto-selected. Pure function, snapshot-tested with fixture photos.

Other providers (Panoramax, …) plug in through the same `NormalizedPhoto` + heading, so the finder is
provider-agnostic; we ship Mapillary first.

## 4. Map rendering

- Viewpoint marker: same shape as the view-cone marker but different style (outline/dashed, app
  accent color) + role icon. Undirected = circle with 4 small ticks.
- Candidate photos: existing view-cone style, selected one highlighted (reuse
  `StreetLevelImageryViewCone` / `SelectionOverlay`).
- Pre-defined viewpoints (Knotenpunkte) render inactive until clicked.

## 5. Floating photo viewer (`FloatingPhotoViewer`)

- Floating boxes over the map, **one per provider** (Mapillary box, later Street View box), draggable
  / collapsible, position remembered per viewer (localStorage), not in the right sidebar anymore.
- Box content = existing provider panel (`MapillaryPanel`, …). Prev/next inside the native viewer
  keeps updating the map highlight (existing `useViewerStore` sync).
- Toolbar above the image:
  - **Suggested views strip**: one chip per viewpoint × direction, with role icon + arrow
    (e.g. `▶ start →`, `◀ start ←`, `⌖ here ↑`), grey when no photo found. Click = switch.
  - **History back/forward** (◀ ▶) over every photo shown in this session, incl. photos reached via
    native prev/next. Keyboard: `[` / `]` (tbd).
  - Photo meta line: date, age badge (red if older than filter), provider link.
- Headless-first API so each app can style it: `useViewpointSession()` returns suggestions,
  selection, history, actions; `FloatingPhotoViewer` is the default UI on top.

### State

- Session store (zustand, FMC conventions): `viewpoints`, `suggestions`, `activeKey`, `history[]`,
  `historyIndex`, actions `open(viewpoints)`, `select(key)`, `back()`, `forward()`, `close()`.
- App-level URL state stays in the app: here `clicked`/`selected` search params extended with the
  viewpoint (lng/lat/bearing) so a link reproduces the view. History is session-only (not in URL).

## 6. Knotenpunkte integration (later phase, other repo)

- On node open: compute approaching ways from the app's streets data → `viewpointsIntoNode(node, ways)`
  → render as inactive viewpoints → click opens `FloatingPhotoViewer` with those 3–4 `into` views,
  2-year filter.
- Optional: "Use this photo" writes the Mapillary ID into the existing `Mapillary-ID` field of the
  rating form (`FullMask.tsx`). (Q7)
- Covered by phase 0 (all repos on latest `maplibre-gl` 6.x).

## 7. Google Street View — what's possible and what it takes

### Getting an API key

1. Google Cloud Console → create/select a project → **attach a billing account** (required even
   within free usage).
2. APIs & Services → Library → enable what we use: **Maps JavaScript API** (interactive panorama),
   optionally **Street View Static API** (metadata + static images), **Map Tiles API** (Street View tiles).
3. APIs & Services → Credentials → **Create API key**.
4. Restrict the key: application restriction **HTTP referrers** (`http://127.0.0.1:*/*`, prod
   domains) and API restriction to only the APIs above. Set quotas/budget alerts.
5. Put it in `.env.local` as `VITE_GOOGLE_MAPS_API_KEY` (already read by the `streetview` adapter).
   It is a browser key, so it is public by design — restrictions are the protection.

(Verify current pricing/free tier at implementation time; Google changed it in 2025 to per-SKU monthly
free caps. Metadata requests are free.)

### Technical options

| Need                                    | API                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| "Is there a pano near here, what date?" | Street View **metadata** endpoint (already used by our adapter), free, one pano per request |
| Interactive viewer in a floating box    | Maps JS `google.maps.StreetViewPanorama` with `pov.heading` = viewpoint bearing             |
| Find pano per viewpoint                 | `StreetViewService.getPanorama({location, radius, preference: NEAREST, source: OUTDOOR})`   |
| Older captures                          | only via `time` links of the JS panorama (undocumented-ish); no bulk date query             |

Limitations vs. Mapillary: **no coverage tiles / no bulk listing**, one "best" pano per location,
panos are 360° so heading matching is trivial (we just set POV), dates are month precision.
So for Street View every viewpoint = 1 metadata call → 1 pano → set heading per direction.

### ⚠ Terms of Service risk (must decide before building)

Google Maps Platform terms restrict showing Google content **together with a non-Google map** and
prohibit caching/storing content. Showing Street View in a box over a MapLibre/OSM map (and drawing
its position as a marker on that map) is likely not permitted. Options: (a) only deep-link out to
Google Maps (`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=lat,lng&heading=…`) —
free, no key, clearly OK; (b) embed and accept the risk for internal-only tools; (c) skip.
**Decision (2026-09-25): (b) — embed `StreetViewPanorama` in the floating box over the MapLibre map**, with the viewpoint/pano position drawn on our map. This is technically possible: the Maps JS API panorama works without a Google map (`new google.maps.StreetViewPanorama(div, {position, pov})`). ToS risk accepted for now; keep the deep link as a secondary action and revisit before any public release.

## Phases

0. **MapLibre latest everywhere** (decided 2026-09-25): bump `maplibre-gl` to the latest 6.x in this app, `street-space-editor` (all packages + app) and set the `street-imagery-react` peer range to `^6` only (drop `^5`); align knotenpunkte/tilda-geo to the same latest version. Fix breaking changes, run `bun run check` in each repo.
1. **Core viewpoints + finder** (package core, tests only). Composer-sized once spec is agreed.
2. **Map layer + floating viewer (Mapillary)** in this app, replaces right-sidebar viewer for photos.
3. **Line click** (way snapping; needs a clickable line source here — which lines? Q3).
4. **History + suggested-views toolbar polish**.
5. **Knotenpunkte integration** (+ maplibre 6 peer range, publish alpha).
6. **Street View** embedded panorama in the floating viewer (§7, option b).

## Decisions (2026-09-25) — these override earlier sections

1. **Package home:** `@osm-editor-kit/street-imagery` + `street-imagery-react` in
   `OSM/street-space-editor/packages` (`street-space-editor` is a symlink to `parking-lanes`, which the
   `file:` deps point at). No new package.
2. **Floating viewer replaces the right sidebar.** See “Sidebar → floating UX” below for what must survive.
3. **Clickable lines:**
   - this app: new overlay of road/foot/bike ways from the basemap vector tiles (OpenFreeMap
     `openmaptiles` source, `transportation` layer), thin blue lines on top, clickable, hover highlight.
   - tilda-geo: its own TILDA lines (via its existing `interactiveLayerIds` / inspector click flow).
   - knotenpunkte: no line click, only the predefined viewpoints.
4. **Line viewpoints:** start, end, click point only. No viewport clipping.
5. **Ranking:** direction matters, so **prefer newest flat photos over older panos**, unless the
   app’s photo-type filter says otherwise. Panos stay candidates (yaw set to bearing) and win only on recency/quality.
6. **Age filter:** knotenpunkte max 2 years. **Nodes with no matching image get a different map color**
   (needs a per-node “has photos” check → cheap coverage lookup from tiles, cached).
7. (Knotenpunkte Mapillary-ID field: not decided, leave out for now.)
8. **Street View:** embedded `StreetViewPanorama`, UX as close to the Mapillary box as possible
   (same box, same toolbar, same history, position + heading cone on our map).
9. **URL:** only the currently selected image in the URL; viewpoints/suggestions/history local state.
10. **Delivery:** build everything in one go, one review at the end (phases below are internal order only).

## Sidebar → floating UX

What the right panel does today (`src/features/panels/RightPanel.tsx`), and where it goes:

| Today                                                                   | Floating UI                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hint “Click the map…”, loading spinner, empty/error messages            | Small status pill at the viewpoint / top of the box (“Loading…”, “No photos ≤ 2 y here”, “Street View key missing”)                                                          |
| List of sequence groups at click (`SequenceGroupCard`), expand = viewer | Box shows the best photo directly; a **“More photos here (n)”** drawer inside the box lists the other groups/sequences, compact rows with date + direction arrow + thumbnail |
| Prev/next per sequence                                                  | Native viewer navigation (mapillary-js), synced to map + history                                                                                                             |
| `PhotoMetadata` (date, id, links)                                       | Compact footer line in the box; details on expand                                                                                                                            |
| Map features (`MapFeatureCard`: signs/objects)                          | Separate small floating card (or map popup) near the click, not mixed into the photo box                                                                                     |
| Apple Look Around link card / embed                                     | Link in the box footer (“Open in Look Around”) — no own box                                                                                                                  |
| Streetside nearby bubbles                                               | Stays a provider box using `StreetsidePanel`                                                                                                                                 |
| Panel open/close + resize state in URL                                  | Box: minimize to a chip, drag, resize; layout per provider in localStorage                                                                                                   |

UX principles: the map stays usable (boxes default to bottom-right, stack/tab when >1 provider, never
cover the viewpoint); the suggestion chips are the primary navigation; one Esc closes; keyboard `[`/`]`
for history. On narrow screens the box becomes a bottom sheet. The left panel (filters, legend) stays.

## Clickable line overlay (this app)

- Source: the basemap already loads the OpenFreeMap vector source; add our own layer(s) on
  source-layer `transportation`, filter `class` in `motorway…service, track, path` (incl.
  `subclass` footway/cycleway/pedestrian/steps as available), `line-color` blue, `line-width` ~1–1.5 px by zoom,
  plus a wider transparent hit layer for easy clicking.
- react-map-gl: `interactiveLayerIds` on `<Map>` → `onClick` / `onMouseMove` get `e.features`;
  cursor `pointer` on hover; hover via `feature-state` (pattern from tilda-geo
  `Map/RegionMap.tsx` + `utils/useInteractiveLayers.ts`). Needs `promoteId` or stable ids —
  basemap features may lack ids, so fall back to a filter-based highlight layer.
- Clicked line geometry comes from the tile (may be split at tile edges) → merge rendered
  fragments with the same name/osm id via `querySourceFeatures`, good enough for start/end.
- Open: check openmaptiles field names at implementation time (`class`, `subclass`, `osm_id` not always present).

## Original open questions (answered above)

1. **Package home:** extend the existing `@osm-editor-kit/street-imagery(-react)` in
   street-space-editor (my proposal), or a new package (e.g. `street-imagery-viewpoints`)? Which repo
   did you mean by "editor-kit project"?
2. **Right sidebar:** does the floating viewer fully replace the photo viewer in the right panel, or
   do both exist (sidebar = lists/groups, floating = viewing)?
3. **Which lines are clickable in this app?** It currently shows imagery, not OSM ways. Load OSM
   ways (Overpass / vector tiles), or is line-click only for host apps that have their own lines?
4. **"Visible end" of line:** end of the line within the current viewport — correct? And for long
   lines, also a middle point, or strictly start / here / visible end / end?
5. **Pano vs. flat:** prefer 360° panos (can always face the right way) or newest regardless?
6. **Age filter default** outside Knotenpunkte (2 years everywhere? user-adjustable?).
7. **Knotenpunkte:** should choosing a photo fill the `Mapillary-ID` field? Distance of the
   into-node viewpoint from the junction (I'd default 20 m)?
8. **URL state:** should viewpoints be shareable via URL (yes in this app?), and history only in
   memory?
9. Scope check: this is ~5 phases of work — build phase by phase with a review after each?
