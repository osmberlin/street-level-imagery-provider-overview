import type { MapParam } from '@/app/mapParam'

let lastWrittenViewport: MapParam | null = null

export const rememberWrittenMapViewport = (viewport: MapParam) => {
  lastWrittenViewport = viewport
}

export const getLastWrittenMapViewport = () => lastWrittenViewport
