# Work doc: Streetview.vn as a provider

Status 2026-10-02: idea, nothing built. A possible next provider.

## What it is

[Streetview.vn](https://www.streetview.vn) has 360° street-level photos of streets in Vietnam. It
is run by the people behind the OSM user `openmap-vn`.

The source is [openstreetmap/iD#10585](https://github.com/openstreetmap/iD/pull/10585) ("Add
streetview.vn service for Data Photo layer", by Buminta, opened 2024-12-05). It was **closed
without merging on 2026-01-20**.

## Why iD did not take it

Not for technical reasons. The licence was not documented:

- 1ec5 asked for something in writing that explicitly gives OSM contributors the right to use the
  photos.
- The answer was a link to the terms of service (<https://www.streetview.vn/terms>).
- Tobias noted that the terms do not mention OpenStreetMap, and that there is no page about the
  project on the OSM wiki.
- tyrasd closed it: the copyright questions have to be clarified first.

This matters less for this app than for iD. iD is an editor, so its imagery must be allowed as a
mapping source. This app is an overview of providers. It can show a provider and say plainly what
its licence allows. The licence state should be visible in the app, though; see "Suggested order".

## What we know about the API

From the pull request's `modules/services/streetview.js` (not called by us yet):

| What              | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Vector tiles      | `https://gpx-tiles.streetview.vn/{z}/{x}/{y}.mvt`, with a `sequences` layer  |
| Image data        | `https://osm-api.streetview.vn/v1/collections/{collectionId}/items/{itemId}` |
| User search       | `https://osm-api.streetview.vn/v1/user/search?name={username}`               |
| Viewer            | `https://streetview.vn/`                                                     |
| Zoom              | lines from 14, images from 15                                                |
| 360° viewer in iD | Pannellum                                                                    |

The URL scheme (`collections/{id}/items/{id}`, MVT with sequences and pictures) is the one
Panoramax uses, and the iD code is modelled on iD's Panoramax service. So Streetview.vn is likely
a GeoVisio instance, the software behind Panoramax. That is a guess from the URLs, not confirmed.

## How it could fit into our packages

- **If it is GeoVisio:** our Panoramax adapter already speaks that API. The config has
  `panoramaxApiBase`. The work would be to let the adapter run for a second instance with its own
  id, label, colour and tile URL, instead of writing a new adapter. The Panoramax viewer panel
  takes an `endpoint`, so the viewer could be reused too.
- **If it is not:** a new adapter along the lines of the Mapillary one (vector tiles for points and
  sequences), and the existing 360° panel of this app (`PsvPanoPanel`) for viewing.
- **Coverage:** `coverage: { bbox: VIETNAM_BBOX, label: 'Vietnam' }`, as Vegbilder has for Norway.
  Outside Vietnam nothing loads and the left panel says "not available here".
- **Opener:** "open in Streetview.vn" for a clicked place, if their viewer takes coordinates in
  the URL.

## Open questions

- Is it a GeoVisio instance? Check `https://osm-api.streetview.vn/api` or the tile metadata.
- Do the API and the tiles allow requests from other websites (CORS)? iD ran in the browser too,
  so probably yes, but the pull request was never deployed.
- Does the service still run at these addresses? The pull request is from 2024.
- What does the licence allow today? Has anything been published since the pull request closed?
- How much coverage is there, and how recent?

## Suggested order

1. Open one tile and one item in the browser. This answers "does it still run", CORS, and whether
   it is GeoVisio. Half an hour.
2. If it is GeoVisio: make the Panoramax adapter work for more than one instance. This is useful
   beyond Vietnam, since other Panoramax-compatible servers exist.
3. Add Streetview.vn with its coverage area, and state its licence in the provider table of the
   README, with a link to the closed iD pull request.
