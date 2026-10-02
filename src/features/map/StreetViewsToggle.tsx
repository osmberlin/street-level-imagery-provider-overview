import { useAppSearchNavigation } from '@/app/searchNavigation'
import { useAppI18n } from '@/i18n/useAppI18n'

/**
 * Map button for "Street views": shows the clickable streets and makes clicks on a street or an
 * empty spot suggest photos looking that way. Off by default; needs Mapillary.
 */
export const StreetViewsToggle = () => {
  const { search, updateSearch } = useAppSearchNavigation()
  const { t } = useAppI18n()
  const on = search.streetViews === 'on'
  const available = search.providers.includes('mapillary')

  return (
    <button
      aria-pressed={on}
      className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium shadow ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${on ? 'bg-fuchsia-700 text-white ring-fuchsia-800' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}
      disabled={!available}
      onClick={() => updateSearch({ streetViews: on ? 'off' : 'on' }, { replace: true })}
      title={available ? t.streetViews.hint : t.streetViews.needsMapillary}
      type="button"
    >
      <svg
        aria-hidden
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path d="M4 20 9 4M20 20 15 4M12 6v2M12 11v2M12 16v2" />
      </svg>
      {t.streetViews.label}
    </button>
  )
}
