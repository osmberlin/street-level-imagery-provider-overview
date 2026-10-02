import type { MapFeatureImages } from '@osm-editor-kit/street-imagery'
import { create } from 'zustand'

type FeatureTargetStore = {
  /** The map feature (sign, object) whose photos are being viewed; photos turn towards it. */
  target: MapFeatureImages | null
  actions: {
    setTarget: (target: MapFeatureImages | null) => void
  }
}

const useFeatureTargetStore = create<FeatureTargetStore>()((set) => ({
  target: null,
  actions: {
    setTarget: (target) => set({ target }),
  },
}))

export const useFeatureTarget = () => useFeatureTargetStore((state) => state.target)
export const useFeatureTargetActions = () => useFeatureTargetStore((state) => state.actions)
