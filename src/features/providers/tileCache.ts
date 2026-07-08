const tileCache = new Map<string, Promise<unknown>>()

export const getTileCacheKey = (providerId: string, tile: { z: number; x: number; y: number }) =>
  `${providerId}:${tile.z}:${tile.x}:${tile.y}`

export const fetchTileCached = async <T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const existing = tileCache.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = fetcher(new AbortController().signal)
  tileCache.set(key, promise)

  try {
    return await promise
  } catch (error) {
    tileCache.delete(key)
    throw error
  }
}

export const clearTileCache = () => {
  tileCache.clear()
}
