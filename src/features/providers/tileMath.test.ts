import { describe, expect, it } from 'vitest'
import type { Bbox } from '@/features/providers/model'
import {
  clampZoom,
  isNullIslandTile,
  lonToTileX,
  latToTileY,
  tilesForBbox,
} from '@/features/providers/tileMath'

describe('tileMath', () => {
  it('converts Berlin center to z14 tile coordinates', () => {
    expect(lonToTileX(13.405, 14)).toBe(8802)
    expect(latToTileY(52.52, 14)).toBe(5373)
  })

  it('clamps zoom to integer bounds', () => {
    expect(clampZoom(12.7, 10, 15)).toBe(12)
    expect(clampZoom(9.2, 10, 15)).toBe(10)
    expect(clampZoom(16.9, 10, 15)).toBe(15)
  })

  it('returns tiles covering a small bbox', () => {
    const bbox: Bbox = [13.4, 52.5, 13.41, 52.51]
    const tiles = tilesForBbox(bbox, 14)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every((tile) => tile.z === 14)).toBe(true)
  })

  it('skips null island tiles when requested', () => {
    const nullIslandBbox: Bbox = [-0.5, -0.5, 0.5, 0.5]
    const withSkip = tilesForBbox(nullIslandBbox, 14, { skipNullIsland: true })
    const withoutSkip = tilesForBbox(nullIslandBbox, 14)
    expect(withSkip.length).toBeLessThan(withoutSkip.length)
    expect(withSkip.every((tile) => !isNullIslandTile(tile))).toBe(true)
  })
})
