# Streetlevel Imagery Provider Overview

An English-only, light-mode meta-catalog of street-level imagery providers. Explore Mapillary, Panoramax, KartaView, Mapilio, Bing Streetside, Vegbilder photos, and Mapillary traffic signs / map features on a full-screen MapLibre map with shareable URL state.

## Features

- **Click-to-explore** — click the map to list nearby photo sequences and map features in the right panel
- **Photo viewer** — browse sequence photos with prev/next navigation and external provider links
- **Provider layers** — toggle photo providers plus Mapillary signs and map-feature overlays (enabled by default)
- **URL filters** — flat / panorama photo types and optional capture-date range (photos and features use iD-aligned date semantics)
- **Visualization styles** — photo type (panorama vs flat / feature) and age buckets
- **Legends** — per-provider in-viewport counts that respect active filters

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

Map viewport, enabled providers, visualization style, photo-type filters, optional date range, click location, and photo selection are encoded in the query string so links can be shared and restored on reload.

## Panoramax traffic signs

Not included — see [docs/id-provider-research.md](docs/id-provider-research.md) addendum. The public Panoramax MVT endpoint only exposes `pictures` / `sequences` layers at tested zoom levels; iD does not implement a signs overlay either.
