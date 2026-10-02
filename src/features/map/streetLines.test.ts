import { destinationPoint, distanceMeters, type LngLat } from '@osm-editor-kit/street-imagery'
import { describe, expect, it } from 'vitest'
import { joinStreetFragments } from '@/features/map/streetLines'

const origin: LngLat = [13.45, 52.47]
const east = (meters: number) => destinationPoint(origin, 90, meters)

describe('joinStreetFragments', () => {
  it('joins overlapping tile fragments on both ends, in either direction', () => {
    const clicked = [east(100), east(200)]
    const joined = joinStreetFragments(clicked, [
      clicked,
      [east(190), east(300)],
      [east(110), east(0)],
    ])
    expect(distanceMeters(joined[0]!, east(0))).toBeLessThan(0.5)
    expect(distanceMeters(joined[joined.length - 1]!, east(300))).toBeLessThan(0.5)
  })

  it('ignores crossing streets', () => {
    const clicked = [east(0), east(100)]
    const crossing = [destinationPoint(east(100), 0, 50), destinationPoint(east(100), 180, 50)]
    expect(joinStreetFragments(clicked, [crossing])).toEqual(clicked)
  })
})
