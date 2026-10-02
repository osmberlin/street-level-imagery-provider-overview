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
 * The one infra3D project we link to (Berlin). infra3D asks for a login, so the id alone gives
 * no access.
 */
export const INFRA3D_PROJECT_UID = 'ec2428b7-8e49-4d93-80a0-edfec6da1cf3'
