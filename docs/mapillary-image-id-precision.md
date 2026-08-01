# Mapillary image ID precision in `mly1_public` tiles

> Status: **open** — awaiting Mapillary support feedback before implementing a client workaround in this app.

## Problem

Some Mapillary image IDs exceed JavaScript’s `Number.MAX_SAFE_INTEGER` (2⁵³ − 1). For those images, the **public** coverage tiles (`mly1_public`) deliver a **wrong** `properties.id` on the `image` layer. Deep links, thumbnails (`graph.mapillary.com/{id}`), and `mapillary-js` `moveTo(id)` then fail or target the wrong photo.

Upstream report: [openstreetmap/iD#12575](https://github.com/openstreetmap/iD/issues/12575).

## Root cause: corruption in the tile bytes, not in our parser

`mly1_public` encodes `image.properties.id` as a **protobuf double** (wire tag 25), not as a uint64 varint or string.

IEEE 754 doubles only preserve ~53 bits of integer precision. The wrong value is **already in the PBF** when Mapillary generates the tile:

|                                                      | Value               |
| ---------------------------------------------------- | ------------------- |
| Correct image ID (Graph API, mapillary.com URL)      | `26774514888887982` |
| `properties.id` in `mly1_public` tile `14/7861/5363` | `26774514888887984` |

**Client-side MVT patches do not help.** We verified that patching `@mapbox/vector-tile` to read uint64 varints as `BigInt`/string only affects tag-40 uint properties. On real Mapillary tiles, the `image` layer has **zero** tag-40 values for `id`; IDs are double-encoded.

## Quick verification

**Location** (iD #12575): gate near Clonmel, Ireland — `52.6516851, -7.2572637`  
**Tile:** `z=14, x=7861, y=5363`  
**Sequence:** `9SXL4pPBJMh2RbK6IkcwET`

```bash
curl -fsSL --compressed \
  "https://tiles.mapillary.com/maps/vtp/mly1_public/2/14/7861/5363?access_token=YOUR_TOKEN" \
  -o mly1.pbf
```

```bash
# Graph API returns the correct string id
curl "https://graph.mapillary.com/26774514888887982?fields=id&access_token=YOUR_TOKEN"
```

Parse the tile and find the image at the coordinates above — `properties.id` will be `26774514888887984`, not `26774514888887982`.

On tile `14/7861/5363` (July 2026): **27,376** images, **182** with IDs that are not safe integers when read as JS numbers.

## What mapillary.com uses (`mly2`)

The mapillary.com web app loads a different layer:

```
https://tiles.mapillary.com/maps/vtp/mly2/2/{z}/{x}/{y}?access_token=…
```

Same tile `14/7861/5363` via `mly2`:

- All `image.properties.id` values are **strings**
- The gate image above has `id: "26774514888887982"` (correct)

`mly2` is **not usable** as a third-party workaround today:

|                                                    | `mly1_public`        | `mly2`                           |
| -------------------------------------------------- | -------------------- | -------------------------------- |
| Public developer token (embedded in iD / this app) | ✅                   | ❌ 403                           |
| CORS                                               | `*`                  | `https://www.mapillary.com` only |
| Image `id` in tiles                                | double (often wrong) | string (correct)                 |

The [API documentation](https://www.mapillary.com/developer/api-documentation/) TileJSON now describes `image.id` as **String**, which matches `mly2` but not current `mly1_public` encoding.

## Impact on this app

We consume `mly1_public` via `fetchMvt` → `normalizeMapillaryImageFeature` → `photoId`. Affected photos still appear on the map (geometry is fine) but can fail in `MapillaryPanel` (`moveTo`), thumbnails, and shared URLs when the tile id is wrong.

Signs and map-feature layers may have analogous issues for large numeric feature ids; the iD workaround below does not cover those.

## Planned workaround (not implemented yet)

Martin Raifer’s fix in iD ([dc9d3cf](https://github.com/openstreetmap/iD/commit/dc9d3cf5754cbf46a79cfc6a49bd7403132c7fb0)) is the **only supported client-side path** on `mly1_public` today:

1. After selecting a photo whose tile `id` is an unsafe integer (`typeof id === 'number' && id > Number.MAX_SAFE_INTEGER`), call:
   ```
   GET https://graph.mapillary.com/image_ids?sequence_id={sequence_id}
   ```
   (with OAuth / access token as required by the Graph API)
2. Match the tile’s rounded id to the API result by comparing the first ~10 digits of the string forms.
3. Use the corrected string id for `moveTo`, thumbnails, and URL state.

We will **wait for Mapillary support feedback** before implementing this here — ideally `mly1_public` tiles or a public `mly2`-equivalent will be fixed upstream instead.

## References

- [iD #12575](https://github.com/openstreetmap/iD/issues/12575) — bug report and tyrasd’s analysis
- [iD fix dc9d3cf](https://github.com/openstreetmap/iD/commit/dc9d3cf5754cbf46a79cfc6a49bd7403132c7fb0) — `image_ids` lookup workaround
- [Mapillary API documentation](https://www.mapillary.com/developer/api-documentation/) — public tile endpoints
- [mapbox/pbf#44](https://github.com/mapbox/pbf/issues/44) — why generic MVT parsers use JS numbers
