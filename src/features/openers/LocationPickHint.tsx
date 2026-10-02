import { locationOpenerById, openLocationInNewTab } from '@osm-editor-kit/street-imagery'
import {
  useArmedLocationOpenerId,
  useLocationPickActions,
} from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'

/** Hint on the map while a location opener waits for a map click. */
export const LocationPickHint = () => {
  const armedOpenerId = useArmedLocationOpenerId()
  const { disarm } = useLocationPickActions()
  const { map } = useAppSearchNavigation()

  if (!armedOpenerId) {
    return null
  }
  const opener = locationOpenerById[armedOpenerId]

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-14">
      <div
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-lg"
        role="status"
      >
        <span>
          Click the map to open that place in <strong>{opener.label}</strong>
        </span>
        <button
          className="rounded-sm underline decoration-white/50 underline-offset-2 hover:decoration-white"
          type="button"
          onClick={() => {
            disarm()
            openLocationInNewTab(opener, { lngLat: [map.lng, map.lat], zoom: map.zoom })
          }}
        >
          Use map center
        </button>
        <button
          className="rounded-sm text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white"
          type="button"
          onClick={disarm}
        >
          Cancel (Esc)
        </button>
      </div>
    </div>
  )
}
