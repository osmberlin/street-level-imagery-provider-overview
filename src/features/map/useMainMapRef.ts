import { useEffect } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { useMap } from 'react-map-gl/maplibre'
import { MAIN_MAP_ID } from '@/features/map/constants'

const mainMapRef: { current: MapRef | undefined } = { current: undefined }

export const getMainMapRef = () => mainMapRef

export const useMainMapRef = () => {
  const { [MAIN_MAP_ID]: mapRef } = useMap()

  useEffect(
    function syncMainMapRef() {
      mainMapRef.current = mapRef
    },
    [mapRef],
  )
}
