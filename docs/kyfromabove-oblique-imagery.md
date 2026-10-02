# Work doc: KyFromAbove oblique imagery as a provider

Status 2026-10-02: idea, nothing built. A possible next step after the Knotenpunkte integration.

## What it is

[KyFromAbove](https://kyfromabove.ky.gov) is the Commonwealth of Kentucky's aerial imagery
program. It has 3-inch oblique (angled) aerial photos of the whole state, captured between fall
2022 and spring 2024. The imagery is public domain.

The idea comes from [openstreetmap/iD#11853](https://github.com/openstreetmap/iD/issues/11853)
("KyFromAbove oblique imagery", opened by 1ec5 on 2026-02-09, still open, labels `bluesky` and
`streetlevel`). The proposal there: bubbles on the map, and a click opens a panel where you pick a
camera angle and zoom.

## Why it does not fit the existing providers as they are

|                | Mapillary, Panoramax                | KyFromAbove oblique                                          |
| -------------- | ----------------------------------- | ------------------------------------------------------------ |
| A map point is | one photo                           | one exposure point with several camera angles                |
| Taken from     | the street                          | a plane, looking down at an angle                            |
| Navigation     | along a sequence                    | between angles of one point, and between neighbouring points |
| Image format   | JPEG, tiles from the provider's API | Cloud-Optimized GeoTIFF (COG) on AWS                         |
| Coverage       | worldwide                           | Kentucky only                                                |

So it needs three things we do not have yet: a point with several images, a way to read COGs in
the browser, and a panel to switch angles.

## What we know about the data

From the iD issue (not verified by us):

- **Images:** COGs on AWS, public domain.
- **Exposure points:** the official viewer reads them from a FeatureServer that is copyrighted. An
  alternative viewer has a PMTiles file of the centroids; 1ec5 noted it became MIT-licensed.
- **Viewers:** neither existing viewer was openly licensed when the issue was written.

## How it could fit into our packages

1. **Provider adapter** `kyfromabove` in `@osm-editor-kit/street-imagery`:
   - `coverage: { bbox: KENTUCKY_BBOX, label: 'Kentucky' }`. The coverage check exists since the
     Vegbilder change; outside Kentucky nothing loads and the panel says "not available here".
   - `fetchPhotos` reads the exposure points from the PMTiles centroids. One `NormalizedPhoto` per
     camera angle, grouped by a shared `sequenceId` per exposure point, or one photo per point
     with the angles in `details`. To decide; see open questions.
   - `isPano: false`, `heading` = the direction the camera looked.
2. **Map look:** the existing wedges already show a direction per photo, so several angles at one
   point show as several wedges around one dot. We saw that this reads well with Panoramax photos
   that share a position.
3. **Viewer panel:** a flat image viewer with zoom and pan (like `FlatPhotoPanel` in this app),
   plus a small angle picker. The picker can go into the `toolbar` slot of `FloatingPhotoViewer`,
   where the Mapillary feature bar sits today.
4. **Reading COGs:** two routes.
   - In the browser with a COG reader such as geotiff.js, which loads only the tiles and overview
     levels in view. No server of ours, but a new dependency; it should live in an optional entry
     like `/photo-details`, so apps that do not use the provider do not bundle it.
   - Through a tile service (for example TiTiler) that turns COGs into image tiles. Simple in the
     browser, but someone has to run or find such a service.
5. **Opener:** an "open in KyFromAbove" link to the official viewer is cheap and could come first.

## Open questions

- Where exactly are the centroids (URL, schema, licence today), and do they list the image paths
  and camera headings per angle?
- Do the COGs allow cross-origin requests with byte ranges from a browser? Without that, route 4a
  is out.
- One map point per exposure, or one per angle? This decides whether the "several images per
  point" idea needs a change to `NormalizedPhoto`.
- How large is one oblique image, and how fast does it open over the overview levels?
- Is there a second such program (other US states, Bluesky imagery elsewhere) that would make a
  general "oblique aerial" provider worth it instead of a Kentucky one?
- The iD thread: there was said to be a closed pull request with a discussion about LLM-written
  code. It was not found; the issue's one comment and its cross-references were not readable.
  Worth reading before building, to avoid repeating work or a rejected approach.

## Suggested order

1. Read the iD issue's comment and linked items; find the centroid file and check its licence.
2. Spike: load the centroids for a small area and open one COG in the browser. This answers the
   cross-origin and speed questions.
3. Add the opener and the adapter with `coverage`, showing points and wedges only.
4. Add the viewer panel with the angle picker.

Steps 1 and 2 are a few hours and decide whether the rest is worth doing.
