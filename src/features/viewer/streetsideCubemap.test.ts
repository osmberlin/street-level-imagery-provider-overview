import type { Cubemap } from '@photo-sphere-viewer/cubemap-adapter'
import { describe, expect, it } from 'vitest'
import type { NormalizedPhoto } from '@/features/providers/model'
import {
  buildStreetsidePanoramaConfig,
  buildStreetsideTileUrl,
  streetsideTileId,
} from '@/features/viewer/streetsideCubemap'

const template =
  'https://ecn.{subdomain}.tiles.virtualearth.net/tiles/hs1032000332102312{faceId}{tileId}?g=15580&key=test'

const streetsidePhoto: NormalizedPhoto = {
  providerId: 'streetside',
  photoId: template,
  sequenceId: null,
  capturedAt: null,
  isPano: true,
  heading: 90,
  lngLat: [-122.34, 47.61],
  thumbUrl: template,
  streetside: {
    urlTemplate: template,
    subdomains: ['t0', 't1', 't2', 't3'],
  },
}

describe('streetsideTileId', () => {
  it('returns empty string for a single root tile', () => {
    expect(streetsideTileId(0, 0, 1)).toBe('')
  })

  it('maps 2x2 grid positions to quadkey digits', () => {
    expect(streetsideTileId(0, 0, 2)).toBe('0')
    expect(streetsideTileId(1, 0, 2)).toBe('1')
    expect(streetsideTileId(0, 1, 2)).toBe('2')
    expect(streetsideTileId(1, 1, 2)).toBe('3')
  })
})

describe('buildStreetsideTileUrl', () => {
  it('substitutes template placeholders for the front face root tile', () => {
    expect(buildStreetsideTileUrl(template, ['t0', 't1'], 'front', 0, 0, 1)).toBe(
      'https://ecn.t0.tiles.virtualearth.net/tiles/hs103200033210231201?g=15580&key=test',
    )
  })

  it('appends tile digits for subdivided tiles', () => {
    expect(buildStreetsideTileUrl(template, ['t0'], 'right', 1, 0, 2)).toBe(
      'https://ecn.t0.tiles.virtualearth.net/tiles/hs1032000332102312021?g=15580&key=test',
    )
  })
})

describe('buildStreetsidePanoramaConfig', () => {
  it('builds multi-level cubemap tiles panorama config', () => {
    const config = buildStreetsidePanoramaConfig(streetsidePhoto)
    expect(config).not.toBeNull()
    expect(config?.levels).toEqual([
      { faceSize: 512, nbTiles: 1 },
      { faceSize: 1024, nbTiles: 2 },
    ])
    const baseUrl = config?.baseUrl as Cubemap | undefined
    expect(baseUrl?.front).toContain('hs103200033210231201')
    expect(config?.tileUrl('back', 1, 1, 1)).toContain('hs1032000332102312033')
  })

  it('returns null when template is missing', () => {
    expect(
      buildStreetsidePanoramaConfig({
        ...streetsidePhoto,
        streetside: undefined,
      }),
    ).toBeNull()
  })
})
