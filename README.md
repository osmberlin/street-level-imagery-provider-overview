# Street-Level Imagery Provider Overview

A meta-catalog of street-level imagery providers on one full-screen map. Compare where [Mapillary](https://www.mapillary.com), [Panoramax](https://panoramax.xyz), [KartaView](https://kartaview.org), [Mapilio](https://mapilio.com), [Bing Streetside](https://www.bing.com/maps), [Vegbilder](https://vegbilder.atlas.vegvesen.no), [Google Street View](https://www.google.com/maps), and [Apple Look Around](https://www.apple.com/maps/) have coverage, inspect individual photos, and share exactly what you see via the URL.

## What you can do

- **Compare coverage at a glance** — every provider renders as its own dot layer on a full-screen MapLibre map; toggle providers on and off to see who covers your area
- **Click to explore** — click anywhere on the map to list nearby photo sequences (grouped, sorted by distance) and Mapillary signs / map features in the right panel
- **Browse photos** — open a sequence to step through its photos with prev/next navigation, thumbnails, and a deep link into the provider's own viewer
- **Filter imagery** — restrict to flat or panorama photos and/or a capture-date range; map dots, legend counts, and click results all respect the filters
- **Switch visualization styles** — color dots by photo type (panorama vs flat) or by age (≤ 2 years / 2–4 years / > 4 years), with newer imagery drawn on top
- **Read live legends** — under each enabled provider, counts of what is currently in the viewport, broken down by the active style's categories
- **Open a place elsewhere** — the pointer button next to a provider opens a place in that provider's own viewer: click it, then click the map (Shift+click opens the map center right away). Mapillary opens the nearest photo already turned to the place; [infra3D](https://www.infra3d.com) (login required) looks at the clicked spot from the nearest image
- **Share any view** — viewport, providers, style, filters, click location, and photo selection are all in the URL, so links restore the exact state on reload

## Provider support

| Feature                               | Mapillary |     Panoramax      | KartaView | Mapilio | Bing Streetside  | Vegbilder | Google Street View | Apple Look Around |
| ------------------------------------- | :-------: | :----------------: | :-------: | :-----: | :--------------: | :-------: | :----------------: | :---------------: |
| Photo dots on map                     |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |         —          |         —         |
| Sequence lines                        |    ✅     |         ✅         |     —     |   ✅    |        —         |     —     |         —          |         —         |
| Flat vs panorama detection            |    ✅     |         ✅         |     —     |   ✅    | ✅ (always pano) |    ✅     |  ✅ (always pano)  |         —         |
| Capture date (age style, date filter) |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |  ✅ (click only)   |         —         |
| Photo thumbnails in viewer            |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |         —          |         —         |
| Deep link to provider viewer          |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |         ✅         |        ✅         |
| Traffic signs overlay                 |    ✅     |         —          |     —     |    —    |        —         |     —     |         —          |         —         |
| Map features overlay (POIs etc.)      |    ✅     |         —          |     —     |    —    |        —         |     —     |         —          |         —         |
| Minimum zoom for data                 |    12     | 15 (lines from 10) |    12     |   14    |        14        |    14     |   click metadata   |    click link     |

Only Mapillary and Panoramax are enabled by default; the other providers are one click away. The Mapillary signs and map-features overlays are separate toggles (off by default — they are dense enough to bury the photo layers). Google Street View is click-only (no map dots or in-app imagery): without a key it is just an "Open in Google Street View" button; with `GOOGLE_MAPS_API_KEY` in `src/config.ts` (a restricted browser key with the Street View Static API enabled) it gets a checkbox that checks coverage through the Street View Static metadata API when you click the map, and the button opens the panorama turned to the place. Apple Look Around and infra3D are open-only buttons: neither publishes a coverage listing, so there is nothing to draw on the map. Apple opens `maps.apple.com/look-around` (no API key); links that still carry `lookaround` in `providers` keep the click card, with a MapKit JS preview when `VITE_APPLE_MAPKIT_TOKEN` is set. infra3D opens the Berlin project set as `INFRA3D_PROJECT_UID` in `src/config.ts` and needs an infra3D account. Full Look Around coverage dots are blocked without an official listing API — see [docs/lookaround-coverage-spike.md](docs/lookaround-coverage-spike.md). Panoramax traffic signs are not available: the public Panoramax MVT endpoint only exposes `pictures` / `sequences` layers, and the iD editor does not implement a Panoramax signs overlay either — see [docs/id-provider-research.md](docs/id-provider-research.md).

## Development

```bash
bun install
bun dev
bun run check
```

- `bun dev` — start the Vite dev server
- `bun run check` — format, lint, type-check, and run tests
- `bun run build` — production build for GitHub Pages

## URL state

Map viewport, enabled providers, visualization style, photo-type filters, optional date range, click location, and photo selection are encoded in the query string so links can be shared and restored on reload. Filters and date semantics follow the iD editor's behavior (photos match on capture date; signs/map features match on first/last-seen dates).
