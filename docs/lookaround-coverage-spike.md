# Apple Look Around — full map-layer spike (Phase C)

Research notes for adding **coverage dots / sequences** comparable to Mapillary or Bing Streetside. **Do not implement a map layer from reverse-engineered Apple endpoints without an explicit legal decision.**

## Goal

Show panorama locations on the MapLibre map (and optionally capture date / heading) when the user enables Apple Look Around.

## Official APIs

| Need                                | Official support                                            |
| ----------------------------------- | ----------------------------------------------------------- |
| List panos in a bbox / tile         | **None**                                                    |
| Capture date, heading, sequence     | **Not exposed** via MapKit JS Look Around                   |
| Embed interactive viewer at a place | MapKit JS `LookAround` / `LookAroundPreview` (WWDC 2025)    |
| Deep link                           | `https://maps.apple.com/look-around?coordinate={lat},{lng}` |

Apple Maps Server API covers geocoding / search / directions — not street-level coverage tiles.

**Conclusion:** a Streetside-style `fetchPhotos(bbox)` adapter cannot be built on documented APIs.

## Unofficial path (streetlevel / lookaround-map)

Projects such as [sk-zk/streetlevel](https://github.com/sk-zk/streetlevel) and [sk-zk/lookaround-map](https://github.com/sk-zk/lookaround-map) reverse-engineer Apple’s internal Maps endpoints:

- Coverage as **z=17 XYZ tiles** with panorama points
- Metadata: `id`, `build_id`, lat/lon, capture date, heading, car vs backpack
- Imagery as **HEIC** cubemap faces; dynamic auth for some tile types

That would be enough to implement an adapter similar to [`streetside.ts`](../src/features/providers/adapters/streetside.ts).

## Licensing / TOS risk

Apple Developer Program Agreement **Attachment 6** (Apple Maps Service), in substance:

1. Access Map Data **only** through MapKit / MapKit JS / Maps Server API.
2. **No** bulk download, scrape, cache, or secondary/derived database of Map Data.
3. **No** substitute or competing mapping service built from Apple data.
4. When displaying Map Data, use Apple’s map / Look Around UI — do not surface raw Map Data on a third-party basemap without the corresponding Apple view.
5. Caching only temporary and limited for permitted use.

Reverse-engineered coverage tiles used to paint dots on MapLibre are **not** MapKit JS and look incompatible with those terms. A static GitHub Pages site calling those endpoints from the browser is especially exposed (no server to gatekeep; easy to observe).

**Recommendation for this OSM-adjacent project:** do **not** ship unofficial coverage tiles. Prefer:

- Phase 1 link-out (shipped)
- Phase B optional MapKit embed with a developer token
- Wait for Apple to publish a listing API, or use independently licensed open coverage polygons if they ever exist

## Hybrid alternatives (no scrape)

1. **Coarse availability shading** — manually curated city/country polygons from public Apple feature-availability lists (approximate, maintenance burden, not per-street accuracy).
2. **Backend proxy** — does not cure licensing; only hides keys / rate-limits. Still uses forbidden endpoints if scraping.
3. **User-contributed coverage** — out of scope; separate product.

## Decision

| Option                             | Ship?                                                       |
| ---------------------------------- | ----------------------------------------------------------- |
| Official MapKit listing of panos   | Blocked — API missing                                       |
| Unofficial z17 coverage tiles      | **No** (TOS + fragility) unless counsel explicitly approves |
| Link-out + optional MapKit preview | **Yes** (Phase 1 / B)                                       |

Revisit if Apple documents a coverage or metadata API for Look Around.
