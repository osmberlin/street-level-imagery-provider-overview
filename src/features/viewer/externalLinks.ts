import type { NormalizedMapFeature, NormalizedPhoto } from '@/features/providers/model'

export const providerExternalLink = (photo: NormalizedPhoto): string => {
  const [lng, lat] = photo.lngLat

  switch (photo.providerId) {
    case 'mapillary':
      return `https://www.mapillary.com/app/?pKey=${encodeURIComponent(photo.photoId)}&focus=photo`
    case 'panoramax':
      return `https://api.panoramax.xyz/#pic=${encodeURIComponent(photo.photoId)}&focus=pic`
    case 'kartaview':
      if (photo.sequenceId != null && photo.sequenceIndex != null) {
        return `https://kartaview.org/details/${encodeURIComponent(photo.sequenceId)}/${photo.sequenceIndex}`
      }
      return `https://kartaview.org/photo/${encodeURIComponent(photo.photoId)}`
    case 'mapilio':
      return `https://mapilio.com/app?lat=${lat}&lng=${lng}&zoom=17&pId=${encodeURIComponent(photo.photoId)}`
    case 'streetside':
      return `https://www.bing.com/maps?cp=${lat}~${lng}&lvl=18&style=x`
    case 'vegbilder': {
      const year = photo.viewerYear ?? new Date(photo.capturedAt ?? Date.now()).getUTCFullYear()
      return `https://vegbilder.atlas.vegvesen.no/?year=${year}&lat=${lat}&lng=${lng}&view=image&imageId=${encodeURIComponent(photo.photoId)}`
    }
    case 'mapillary-map-features':
    case 'mapillary-signs':
    default:
      return '#'
  }
}

export const mapFeatureExternalLink = (feature: NormalizedMapFeature): string => {
  const [lng, lat] = feature.lngLat
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17&focus=map`
}
