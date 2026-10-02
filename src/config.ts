import type { Infra3dProject } from '@osm-editor-kit/street-imagery'

/**
 * Public client keys. They ship in the JS bundle either way, so they live here instead of `.env`;
 * protect them with provider-side restrictions (HTTP referrer, API allow-list, quotas).
 */

/** Mapillary client token (public, read-only). */
export const MAPILLARY_TOKEN = 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf'

/**
 * Google Maps Platform browser key for Street View lookups, or '' to leave Street View off.
 * How to get one: docs/viewpoint-photo-finder-plan.md, "Getting an API key".
 */
export const GOOGLE_MAPS_API_KEY = ''

/**
 * Bing Maps key for the Streetside overlay, or '' to keep Streetside an "open in" button.
 * Microsoft issues no new Bing Maps keys; existing enterprise keys work until June 30, 2028.
 */
export const BING_MAPS_KEY = ''

/**
 * The infra3D projects we link to; each gets its own "Open in infra3D …" button. `uid` is the
 * `projectUID` of the infra3D URL, `name` is shown on the button. infra3D asks for a login, so
 * the ids alone give no access.
 */
export const INFRA3D_PROJECTS: Infra3dProject[] = [
  {
    // infra3D's own name: "Berlin - Alle Daten". Holds the drives of 2025 (iNovitas) and of
    // 2021 and 2022 (Cyclomedia).
    uid: 'ec2428b7-8e49-4d93-80a0-edfec6da1cf3',
    name: 'Berlin 2025 + 2021/22',
  },
]
