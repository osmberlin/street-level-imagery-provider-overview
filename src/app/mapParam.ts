import { z } from 'zod'

export type MapParam = {
  zoom: number
  lat: number
  lng: number
  bearing?: number
  pitch?: number
}

const roundNumber = (number: number | string, precision?: number) => {
  if (typeof number === 'string') {
    return Number.parseFloat(Number.parseFloat(number).toFixed(precision))
  }
  return Number.parseFloat(number.toFixed(precision))
}

const roundByZoom = (number: number | string, zoom: number) => {
  const latLngPrecisionByZoom = zoom >= 17 ? 5 : zoom < 13 ? 3 : 4
  return roundNumber(number, latLngPrecisionByZoom)
}

export const roundPositionForURL = (lat: number, lng: number, zoom: number) => {
  lat = roundByZoom(lat, zoom)
  lng = roundByZoom(lng, zoom)
  zoom = roundNumber(zoom, 1)
  return [lat, lng, zoom] as const
}

const range = (min: number, max: number) => z.coerce.number().gte(min).lte(max)

const MapParam2dSchema = z
  .tuple([range(0, 22), range(-90, 90), range(-180, 180)])
  .transform(([zoom, lat, lng]) => ({ zoom, lat, lng }) satisfies MapParam)

const MapParam3dSchema = z
  .tuple([range(0, 22), range(-90, 90), range(-180, 180), range(-360, 360), range(0, 85)])
  .transform(
    ([zoom, lat, lng, bearing, pitch]) => ({ zoom, lat, lng, bearing, pitch }) satisfies MapParam,
  )

const legacyMapObjectSchema = z.object({
  zoom: range(0, 22),
  lat: range(-90, 90),
  lng: range(-180, 180),
  bearing: range(-360, 360).optional(),
  pitch: range(0, 85).optional(),
})

export const parseMapParam = (query: string): MapParam | null => {
  const parts = query.split('/')

  if (parts.length === 3) {
    const parsed = MapParam2dSchema.safeParse(parts)
    return parsed.success ? parsed.data : null
  }

  if (parts.length === 5) {
    const parsed = MapParam3dSchema.safeParse(parts)
    return parsed.success ? parsed.data : null
  }

  return null
}

/** Accept slash string or legacy JSON object from dirty share URLs. */
export const coerceMapParam = (raw: unknown): MapParam | null => {
  if (typeof raw === 'string') {
    return parseMapParam(raw)
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const parsed = legacyMapObjectSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  }
  return null
}

const roundCameraValue = (value: number) => Number.parseFloat(value.toFixed(1))

export const serializeMapParam = ({ zoom, lat, lng, bearing, pitch }: MapParam) => {
  const [roundedLat, roundedLng, roundedZoom] = roundPositionForURL(lat, lng, zoom)
  let serialized = `${roundedZoom}/${roundedLat}/${roundedLng}`

  // Present when rotate/pitch is active (MapRoot writes both); omit when absent (flat 2D).
  if (bearing !== undefined && pitch !== undefined) {
    serialized += `/${roundCameraValue(bearing)}/${roundCameraValue(pitch)}`
  }

  return serialized
}

export const mapParamFallback: MapParam = { lat: 52.52, lng: 13.405, zoom: 14 }

export const defaultMapSearchValue = serializeMapParam(mapParamFallback)

export const mapParamsEqual = (a: MapParam, b: MapParam) =>
  a.lat === b.lat &&
  a.lng === b.lng &&
  a.zoom === b.zoom &&
  (a.bearing ?? 0) === (b.bearing ?? 0) &&
  (a.pitch ?? 0) === (b.pitch ?? 0)
