import type { Cubemap } from '@photo-sphere-viewer/cubemap-adapter'
import type { CubemapMultiTilesPanorama } from '@photo-sphere-viewer/cubemap-tiles-adapter'
import type { NormalizedPhoto } from '@/features/providers/model'

const CUBEMAP_FACES: Array<keyof Cubemap> = ['left', 'front', 'right', 'back', 'top', 'bottom']

/**
 * PSV cubemap face → Bing Streetside faceId suffix.
 * Calibration: tweak if the panorama appears rotated or individual faces are swapped.
 */
export const STREETSIDE_FACE_MAP: Record<keyof Cubemap, string> = {
  front: '01',
  right: '02',
  back: '03',
  left: '10',
  top: '11',
  bottom: '12',
}

const STREETSIDE_LEVELS = [
  { faceSize: 512, nbTiles: 1 },
  { faceSize: 1024, nbTiles: 2 },
] as const

const pickSubdomain = (subdomains: string[], face: keyof Cubemap, col: number, row: number) => {
  const index = (face.charCodeAt(0) + col + row) % subdomains.length
  return subdomains[index] ?? 't0'
}

/** Build Bing tileId quadkey digits from tile grid position (row-major quadtree). */
export const streetsideTileId = (col: number, row: number, nbTiles: number) => {
  if (nbTiles <= 1) {
    return ''
  }

  let tileId = ''
  let size = nbTiles
  let x = col
  let y = row

  while (size > 1) {
    size /= 2
    const dx = x >= size ? 1 : 0
    const dy = y >= size ? 1 : 0
    tileId += String(2 * dy + dx)
    x %= size
    y %= size
  }

  return tileId
}

export const buildStreetsideTileUrl = (
  urlTemplate: string,
  subdomains: string[],
  face: keyof Cubemap,
  col: number,
  row: number,
  nbTiles: number,
) => {
  const faceCode = STREETSIDE_FACE_MAP[face]
  const tileId = streetsideTileId(col, row, nbTiles)
  const subdomain = pickSubdomain(subdomains, face, col, row)

  return urlTemplate
    .replace('{subdomain}', subdomain)
    .replace('{faceId}', faceCode)
    .replace('{tileId}', tileId)
}

export const buildStreetsidePanoramaConfig = (
  photo: NormalizedPhoto,
): CubemapMultiTilesPanorama | null => {
  const template = photo.streetside?.urlTemplate
  if (!template || !template.includes('{')) {
    return null
  }

  const subdomains =
    photo.streetside?.subdomains && photo.streetside.subdomains.length > 0
      ? photo.streetside.subdomains
      : ['t0', 't1', 't2', 't3']

  const baseUrl = Object.fromEntries(
    CUBEMAP_FACES.map((face) => [
      face,
      buildStreetsideTileUrl(template, subdomains, face, 0, 0, 1),
    ]),
  ) as Cubemap

  return {
    baseUrl,
    levels: [...STREETSIDE_LEVELS],
    tileUrl: (face, col, row, level) => {
      const levelConfig = STREETSIDE_LEVELS[level]
      if (!levelConfig) {
        return null
      }
      return buildStreetsideTileUrl(template, subdomains, face, col, row, levelConfig.nbTiles)
    },
  }
}
