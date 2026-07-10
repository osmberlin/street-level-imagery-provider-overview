# Interactive photo viewer — design

Replace the static sidebar thumbnail with provider-native interactive viewers, add view-direction
indicators (FOV cone / heading wedge) on the map, and keep map ↔ viewer state in sync both ways.

References studied: `mapillary/api-demo`, `a-b-street/speedwalk`, iD editor `modules/services/*`,
Rapid editor services. Key findings baked in below.

## Current architecture (as of this doc)

- All shared state is TanStack Router URL search params (`src/app/searchSchema.ts`):
  `map` (z/lat/lon), `providers`, `photoTypes`, `date`, `clicked` (lng/lat of map click),
  `selected` (`{provider, sequenceId?, photoId?, featureId?}`).
- Map click (`src/features/map/MapRoot.tsx` `handleClick`) writes `clicked`, clears `selected`.
  `RightPanel` derives nearby photo groups (`useClickedPhotos` → `groupClickedPhotos`), user picks a
  group → `selected` is written. Prev/Next in `SequenceGroupCard.tsx` rewrites `selected.photoId`.
- `PhotoViewer.tsx` renders a static `<img>` thumbnail (via `usePhotoThumbnail`) + metadata.
- `MapSelectionHighlight.tsx` draws a ringed circle on the selected photo + highlighted sequence
  line. No direction/cone rendering exists.
- Adapters (`src/features/providers/adapters/*`) normalize to `NormalizedPhoto`
  (`src/features/providers/model.ts`): `photoId`, `sequenceId`, `capturedAt`, `isPano`,
  `heading` (may be null), `lngLat`, optional `thumbUrl`, `sequenceIndex` (kartaview),
  `viewerYear` (vegbilder).

## Target architecture

### Viewer panels (`src/features/viewer/panels/`)

One interactive panel per provider family, selected by `ViewerPanelSwitch` based on
`photo.providerId` + `photo.isPano`. Rendered where `<PhotoViewer>` renders today (expanded active
`SequenceGroupCard`), with a taller container (aspect ~4:3, full card width). `PhotoViewer`'s
metadata `<dl>` + external link stay below the panel.

| providerId | isPano | Panel | Library | prev/next |
|---|---|---|---|---|
| mapillary | any | `MapillaryPanel` | `mapillary-js@^4.1.2` | native sequence component |
| panoramax | any | `PanoramaxPanel` | `@panoramax/web-viewer@^5.1.2` `<pnx-photo-viewer>` | native |
| streetside | always pano | `StreetsidePanel` | PSV core + `cubemap-tiles-adapter` | virtual-tour arrows (nearby bubbles) |
| mapilio, vegbilder, kartaview | pano (`isPano === true`) | `PsvEquirectPanel` | `@photo-sphere-viewer/core@^5.14` + `virtual-tour-plugin` | virtual-tour GPS-mode arrows from group photos |
| mapilio, vegbilder, kartaview | flat / unknown | `FlatPhotoPanel` | none (pointer pan + wheel zoom, ~100 lines) | existing card buttons |

New deps: `mapillary-js`, `@panoramax/web-viewer`, `@photo-sphere-viewer/core`,
`@photo-sphere-viewer/cubemap-tiles-adapter`, `@photo-sphere-viewer/virtual-tour-plugin`,
`zustand@^5`. All viewers are framework-agnostic: mount into a `div` ref inside `useEffect`, keep
the instance in a ref (never state), `remove()/destroy()` on cleanup, `resize()` on container
resize (ResizeObserver).

### Ephemeral viewer state — zustand store

`src/features/viewer/useViewerStore.ts` (FMC zustand conventions: custom-hook exports only, atomic
selectors, `actions` namespace):

```ts
type ViewerState = {
  /** Live look direction in map degrees (photo heading + in-viewer yaw), null when no viewer. */
  bearing: number | null
  /** Horizontal FOV in degrees, for cone width. */
  hfov: number | null
  /** Live camera position from the viewer (mapillary moves between images). */
  lngLat: [number, number] | null
  actions: { setPov: (...) => void; reset: () => void }
}
```

Bearing updates are throttled (~30 ms / rAF). URL is NOT touched by bearing changes.

### Map indicators (`src/features/map/ViewDirectionIndicator.tsx`)

Rendered inside `MapRoot` next to `MapSelectionHighlight`. Declarative `Source`/`Layer`
(react-map-gl conventions). For the **selected photo only**:

- **Pano**: filled sector polygon ("cone"), apex at photo position, direction = store `bearing`
  (fallback `photo.heading`), width = store `hfov` (fallback 60°), radius scaled to be roughly
  constant on screen (meters = f(zoom), like `clickRadius.ts`). Rotates live as the user pans
  inside the viewer (speedwalk pattern: derived GeoJSON, recomputed on state change).
- **Flat**: narrower wedge (~30°) at static `photo.heading`; no live rotation (except providers
  whose viewer reports yaw — then heading + yaw). If `heading` is null → no indicator.
- Geometry helper `src/features/map/viewCone.ts`: `viewConeGeoJson(lngLat, bearingDeg, fovDeg,
  radiusMeters)` — hand-rolled sector (no turf dep), unit-tested (bearing 0/90/wraparound at ±180°,
  degenerate fov).

Additionally (nice-to-have, phase A): the existing provider circle layers stay as-is; direction
display is selected-photo-only for now.

### Two-way sync

**Map → viewer**: panels receive `photo` (from `selected`) as prop; when `selected.photoId` changes
externally (map click → group select, card prev/next), the panel navigates its viewer:
- mapillary: `viewer.moveTo(id)` guarded by the **`navigable` event + pendingImageId queue**
  (api-demo pattern — `moveTo` throws mid-transition; queue the id, flush on navigable).
- panoramax: set `picture` attribute/property on `<pnx-photo-viewer>`.
- PSV: `virtualTour.setCurrentNode(id)` / `viewer.setPanorama(url)`.
Panels must distinguish self-initiated changes (see below) to avoid loops: keep a
`lastViewerPhotoIdRef`; only call moveTo when prop ≠ ref.

**Viewer → map**: on viewer-native navigation (mapillary `image` event, panoramax picture-change
event, virtual-tour `node-changed`):
1. set `lastViewerPhotoIdRef`, then write `selected.photoId` (+ sequenceId if changed) via
   `useAppSearchNavigation` `updateSelected` `{replace: true}`.
2. `map.easeTo({center})` via `useMap()` (`MAIN_MAP_ID`) **only when the new photo is outside the
   current viewport or near its edge** — don't fight the user (api-demo `suppressFlyTo` lesson:
   never recenter on the photo the user just clicked on the map).
3. update viewer store `lngLat`.

**Bearing**: mapillary `bearing` event (absolute map degrees); PSV `position-updated`
(`yaw` radians → degrees, bearing = photo.heading + yaw, normalize 0–360; PSV `panoData.poseHeading`
or `sphereCorrection` set from heading so pano north is aligned — iD used pannellum `northOffset:
ca`); panoramax: underlying PSV events if exposed, else its documented rotation event; zoom/fov →
`hfov`. All → `useViewerStore.actions.setPov`, throttled.

`MapSelectionHighlight` (active pin ring) already derives from `selected` — unchanged, it follows
automatically.

### Image sources per provider (for PSV/flat panels)

- kartaview: full image `https://storage{1..}.openstreetcam.org/{name}` — adapter already builds
  `thumbUrl` from `lth_name ?? name`; add `fullUrl` (from `name`) to `NormalizedPhoto` as optional
  field if needed.
- mapilio: `photoThumbnails.ts` already fetches sequence-detail → cdn URL (1080); reuse the same
  fetch for the panel (2048 variant `2080` exists).
- vegbilder: adapter has `URLPREVIEW` (thumb); WFS `URL` field is the full image — extend the
  adapter to also carry it (optional `fullUrl`).
- streetside: cubemap quadkey tiles
  `https://ecn.t{0-3}.tiles.virtualearth.net/tiles/hs{quadkey16}{faceCode}{subtile}.jpg`, faces
  `01/02/03/10/11/12` = front/right/back/left/up/down; PSV cubemap-tiles `tileUrl(face, col, row)`
  maps face name → Bing face code, col/row → sub-quadkey digits. The adapter's `thumbUrl` carries
  the metadata `imageUrl` template; extend adapter to keep the raw template + subdomains. Per-face
  orientation fixes may be needed (iD/Rapid had them) — acceptable to iterate.
- Pano north alignment: set viewer north offset from `photo.heading` (iD: pannellum
  `northOffset: ca`; PSV: `panoData.poseHeading = heading`).

### Sequence data for virtual-tour prev/next

The active `PhotoSequenceGroup` (from `groupClickedPhotos`) already holds ordered photos of the
clicked sequence — pass `group.photos` into the panel; virtual-tour GPS-mode nodes = those photos
(id, position, panorama url, links to neighbors by array order). Streetside (no sequences): use
the group's nearby bubbles the same way.

## Phasing (each phase: implement → `bun run check` → review → commit)

- **A — foundation + Mapillary**: deps, `useViewerStore`, `viewCone.ts` + tests,
  `ViewDirectionIndicator` (pano cone + flat wedge incl. static fallback for ALL providers from
  `photo.heading`), `ViewerPanelSwitch` scaffold (non-mapillary falls back to current
  `PhotoViewer`), `MapillaryPanel` fully wired (native nav, navigable queue, bearing→cone,
  image→selected+ease, resize handling, `mapillary-js/dist/mapillary.css` import).
- **B — Panoramax**: `<pnx-photo-viewer>` panel + sync (React 19 custom-element props), pano+flat.
- **C — PSV generic**: `PsvEquirectPanel` (mapilio/vegbilder/kartaview panos, virtual-tour from
  group photos) + `FlatPhotoPanel` (pan/zoom) + adapter `fullUrl` extensions.
- **D — Streetside**: cubemap-tiles panel + nearby-bubble navigation.

## Constraints

- React 19 + React Compiler is on: no manual memo needed; keep viewer instances in refs; effects
  need cleanup; name effects per react-dev skill conventions.
- Tokens: Mapillary client token already in `mapillaryShared.ts` (`MAPILLARY_ACCESS_TOKEN`).
- Checks: `bun run check` (oxfmt, oxlint, tsc --noEmit via tsgo, vitest) must pass.
- Bundle: lazy-load heavy viewer libs via `React.lazy`/dynamic `import()` per panel so the map app
  doesn't pay for three.js upfront.
