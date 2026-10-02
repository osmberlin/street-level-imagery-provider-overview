# Work doc: Wikimedia Commons as a provider

Status 2026-10-02: idea, nothing built. A possible next provider.

## What it is

[Wikimedia Commons](https://commons.wikimedia.org) has millions of photos with coordinates. They
are not street-level drives but single photos: buildings, squares, signs, monuments. Shown on the
map next to Mapillary and Panoramax, they fill gaps where no one drove.

The source is [openstreetmap/iD#11666](https://github.com/openstreetmap/iD/pull/11666) ("add
wikimedia commons as an photo service", by k-yle, opened 2025-12-12). It is an **open draft**; it
closes iD issue #10640.

## How the iD draft gets the photos

It uses two MediaWiki APIs in one request: [Geosearch](https://www.mediawiki.org/wiki/API:Geosearch)
for the files in a bounding box and [Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo) for
their details. Shortened:

```
https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*
  &generator=geosearch&ggsnamespace=6&ggslimit=500&ggsbbox=<north>|<west>|<south>|<east>
  &prop=coordinates|imageinfo&iiprop=timestamp|user|url|extmetadata|metadata|size
  &iiextmetadatafilter=LicenseShortName&iiurlwidth=300
```

`origin=*` makes the API answer requests from other websites, so it works from the browser. One
request gives at most 500 files.

## What the draft says is unsolved

- **The date is the upload date, not the capture date.** The two can be years apart. The capture
  date is in the EXIF data or in Commons' structured data, which this API does not return.
- **The user is the uploader, not the author.** They often differ, for example for files imported
  from Flickr.
- **No direction.** The draft has no heading. It could come from EXIF (`GPSImgDirection`) or from
  structured data.
- **Licences.** Every file has its own licence (`LicenseShortName`, and a flag
  `AttributionRequired`). The draft has no licence filter yet.
- **API load.** The draft's author wants fewer requests and suggests telling Wikimedia's site
  reliability team before it ships.

## The licence discussion, and what it means here

The long discussion in the pull request is about mapping from the photos: may a mapper take facts
from a CC BY-SA photo into OSM? One side says facts are not copyrightable and all Commons photos
can be used. The other points at OSM's rule to use only sources with compatible licences, and
wants to restrict to files where `AttributionRequired` is false (public domain, CC0, "No
restrictions"). It is not settled.

For this app the question is narrower. Showing Commons photos with author, licence and a link to
the file page is what Commons licences ask for. We already show creator and licence for Panoramax
per photo, so the same footer works. If the photos are later used for mapping in Knotenpunkte or
tilda-geo, the open question above applies there.

## How it could fit into our packages

- **Adapter** `commons` in `@osm-editor-kit/street-imagery`: `fetchPhotos(bbox)` with the request
  above, one `NormalizedPhoto` per file. `isPano: false`, `sequenceId: null`, `thumbUrl` and
  `fullUrl` from Imageinfo, `creatorName` = uploader, `details.license` and `details.licenseUrl`
  from the metadata.
- **Tiles and zoom:** load in tiles from a high zoom only (16 or closer) and cache them, as the
  KartaView adapter now does. That keeps the number of requests small.
- **Viewer:** the flat photo panel of this app (`FlatPhotoPanel`, zoom and pan) is enough. The
  photo details dialog can show the rest.
- **Map look:** photos without a heading show as dots without a wedge; that already works.
- **Filter:** the photo date filter would act on the upload date. That is misleading, so either
  read the capture date from EXIF (`DateTimeOriginal` is in `iiprop=metadata`) or label the date
  as "uploaded" for this provider.
- **Opener:** "open in Commons" could link to the file page of a photo. A link for a map position
  is harder; Commons has no simple "photos near here" page.

## Open questions

- Does `iiprop=metadata` give `DateTimeOriginal` and `GPSImgDirection` for enough files to rely
  on? If yes, date and direction are solved without structured data.
- Do we want a licence filter, and if so the strict one (`AttributionRequired` false) as an option?
- What do Wikimedia's API usage guidelines ask of a client like this (user agent, rate)? The
  browser cannot set a custom user agent.
- 500 files per request: is that enough for a zoom-16 tile in a city centre, or do tiles need to
  be smaller there?
- How does the iD draft end? If iD lands it, its tiling and licence decisions are worth copying.

## Suggested order

1. Call the API for a tile in Berlin Mitte and look at the answer: how many files, how many with
   capture date and direction in the metadata. An hour.
2. Write the adapter with small cached tiles; show dots, the flat viewer and the footer with
   uploader, licence and link.
3. Decide on capture date versus upload date, and on the licence filter.
4. Tell Wikimedia's site reliability team if this goes into a public app with real traffic.
