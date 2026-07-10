# Street-Level Imagery Provider Overview

A meta-catalog of street-level imagery providers on one full-screen map. Compare where [Mapillary](https://www.mapillary.com), [Panoramax](https://panoramax.xyz), [KartaView](https://kartaview.org), [Mapilio](https://mapilio.com), [Bing Streetside](https://www.bing.com/maps), and [Vegbilder](https://vegbilder.atlas.vegvesen.no) have coverage, inspect individual photos, and share exactly what you see via the URL.

## What you can do

- **Compare coverage at a glance** — every provider renders as its own dot layer on a full-screen MapLibre map; toggle providers on and off to see who covers your area
- **Click to explore** — click anywhere on the map to list nearby photo sequences (grouped, sorted by distance) and Mapillary signs / map features in the right panel
- **Browse photos** — open a sequence to step through its photos with prev/next navigation, thumbnails, and a deep link into the provider's own viewer
- **Filter imagery** — restrict to flat or panorama photos and/or a capture-date range; map dots, legend counts, and click results all respect the filters
- **Switch visualization styles** — color dots by photo type (panorama vs flat) or by age (≤ 2 years / 2–4 years / > 4 years), with newer imagery drawn on top
- **Read live legends** — per-provider counts of what is currently in the viewport, broken down by the active style's categories
- **Share any view** — viewport, providers, style, filters, click location, and photo selection are all in the URL, so links restore the exact state on reload

## Provider support

| Feature                               | Mapillary |     Panoramax      | KartaView | Mapilio | Bing Streetside  | Vegbilder |
| ------------------------------------- | :-------: | :----------------: | :-------: | :-----: | :--------------: | :-------: |
| Photo dots on map                     |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |
| Sequence lines                        |    ✅     |         ✅         |     —     |   ✅    |        —         |     —     |
| Flat vs panorama detection            |    ✅     |         ✅         |     —     |   ✅    | ✅ (always pano) |    ✅     |
| Capture date (age style, date filter) |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |
| Photo thumbnails in viewer            |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |
| Deep link to provider viewer          |    ✅     |         ✅         |    ✅     |   ✅    |        ✅        |    ✅     |
| Traffic signs overlay                 |    ✅     |         —          |     —     |    —    |        —         |     —     |
| Map features overlay (POIs etc.)      |    ✅     |         —          |     —     |    —    |        —         |     —     |
| Minimum zoom for data                 |    12     | 15 (lines from 10) |    12     |   14    |        14        |    14     |

The Mapillary signs and map-features overlays are separate toggles (off by default — they are dense enough to bury the photo layers). Panoramax traffic signs are not available: the public Panoramax MVT endpoint only exposes `pictures` / `sequences` layers, and the iD editor does not implement a Panoramax signs overlay either — see [docs/id-provider-research.md](docs/id-provider-research.md).

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
