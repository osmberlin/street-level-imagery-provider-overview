import { findLocationOpener, openLocationInNewTab } from '@osm-editor-kit/street-imagery'
import {
  useArmedLocationOpenerId,
  useLocationPickActions,
} from '@osm-editor-kit/street-imagery-react'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAppI18n } from '@/i18n/useAppI18n'

/** Hint on the map while a location opener waits for a map click. */
export const LocationPickHint = () => {
  const armedOpenerId = useArmedLocationOpenerId()
  const { disarm } = useLocationPickActions()
  const { map } = useAppSearchNavigation()
  const { t } = useAppI18n()

  const opener = armedOpenerId ? findLocationOpener(armedOpenerId) : undefined
  if (!opener) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-14">
      <div
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-lg"
        role="status"
      >
        <span>
          {t.opener.clickMapToOpenIn} <strong>{opener.label}</strong>
        </span>
        <button
          className="rounded-sm underline decoration-white/50 underline-offset-2 hover:decoration-white"
          type="button"
          onClick={() => {
            disarm()
            openLocationInNewTab(opener, { lngLat: [map.lng, map.lat], zoom: map.zoom })
          }}
        >
          {t.opener.useMapCenter}
        </button>
        <button
          className="rounded-sm text-white/70 underline decoration-white/30 underline-offset-2 hover:text-white"
          type="button"
          onClick={disarm}
        >
          {t.opener.cancel}
        </button>
      </div>
    </div>
  )
}
