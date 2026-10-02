import { isSignValue, signGroupIds } from '@osm-editor-kit/street-imagery'
import { SIGN_GROUP_IDS } from '@/app/searchSchema'

type SignGroupId = (typeof SIGN_GROUP_IDS)[number]

const cache = new Map<string, (value: string) => boolean>()

/**
 * Filter for the map-feature layers: signs of the chosen groups; other objects always pass.
 * `undefined` when all groups are on. Cached per selection, so the function identity is stable.
 */
export const signGroupFilter = (groups: readonly SignGroupId[]) => {
  if (groups.length === SIGN_GROUP_IDS.length) {
    return undefined
  }
  const key = [...groups].sort().join(',')
  let filter = cache.get(key)
  if (!filter) {
    const chosen = new Set<string>(groups)
    filter = (value) => !isSignValue(value) || signGroupIds(value).some((id) => chosen.has(id))
    cache.set(key, filter)
  }
  return filter
}
