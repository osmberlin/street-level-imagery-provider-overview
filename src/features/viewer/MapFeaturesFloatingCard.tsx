import { useState } from 'react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { MapFeatureCard } from '@/features/viewer/MapFeatureCard'
import { useClickedMapFeatures } from '@/features/viewer/useClickedMapFeatures'

/** Detected signs/objects near the click, kept apart from the photo viewer (top-left of the map). */
export const MapFeaturesFloatingCard = () => {
  const { search } = useAppSearchNavigation()
  const mapFeatures = useClickedMapFeatures()
  const clickKey = search.clicked ? `${search.clicked.lng},${search.clicked.lat}` : null
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)

  if (mapFeatures.length === 0 || clickKey == null || dismissedFor === clickKey) {
    return null
  }

  return (
    <section
      aria-label="Map features near the click"
      className="absolute top-3 left-3 z-10 flex max-h-[45%] w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl bg-white/95 shadow-lg ring-1 ring-slate-200"
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Map features here ({mapFeatures.length})
        </h2>
        <button
          aria-label="Hide map features"
          className="rounded-md px-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => setDismissedFor(clickKey)}
          type="button"
        >
          ×
        </button>
      </header>
      <ul className="space-y-2 overflow-y-auto p-2">
        {mapFeatures.map((feature) => (
          <li key={`${feature.providerId}:${feature.featureId}`}>
            <MapFeatureCard feature={feature} />
          </li>
        ))}
      </ul>
    </section>
  )
}
