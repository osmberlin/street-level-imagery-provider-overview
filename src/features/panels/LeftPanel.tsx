import { getGoogleMapsApiKey } from '@osm-editor-kit/street-imagery'
import {
  adapterById,
  isBrowserAvailableProvider,
  isClickOnlyPhotoProvider,
  PROVIDERS,
  providerById,
  type ProviderId,
} from '@osm-editor-kit/street-imagery'
import { providerLocationLink } from '@osm-editor-kit/street-imagery'
import { useMapViewportBbox } from '@osm-editor-kit/street-imagery-react'
import { twMerge } from 'tailwind-merge'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import type { AppSearch } from '@/app/searchSchema'
import {
  DEFAULT_MAX_AGE_YEARS,
  DEFAULT_PHOTO_TYPES,
  defaultDateFrom,
  SIGN_GROUP_IDS,
} from '@/app/searchSchema'

const SIGN_GROUP_LABELS: Record<(typeof SIGN_GROUP_IDS)[number], string> = {
  bike: 'Bike',
  speed: 'Speed',
  access: 'Access & oneway',
  other: 'Other',
}
import { MAIN_MAP_ID } from '@/features/map/constants'
import { ProviderLegend } from '@/features/panels/ProviderLegend'
import { useResizableLeftPanelWidth } from '@/features/panels/useResizableLeftPanelWidth'

const STYLE_OPTIONS: { value: AppSearch['style']; label: string }[] = [
  { value: 'photoType', label: 'Photo type' },
  { value: 'age', label: 'Age' },
]

const ExternalLinkIcon = () => (
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
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
)

const CloseIcon = () => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const PanelOpenIcon = () => (
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
    <rect height="14" rx="2" width="18" x="3" y="5" />
    <path d="M9 5v14" />
  </svg>
)

export const LeftPanel = () => {
  const { ref, onResizeHandlePointerDown } = useResizableLeftPanelWidth()
  const {
    map,
    search,
    updateProviders,
    updateStyle,
    updatePhotoTypes,
    updateDate,
    updateLeftPanel,
    updateSearch,
  } = useAppSearchNavigation()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const activeProviders = new Set(search.providers)
  const { lat: mapLat, lng: mapLng, zoom: currentZoom } = map
  const enabledProviders = PROVIDERS.filter((provider) => activeProviders.has(provider.id))
  const isOpen = search.leftPanel !== 'closed'

  const photoTypeSet = new Set(search.photoTypes)
  const flatChecked = photoTypeSet.has('flat')
  const panoChecked = photoTypeSet.has('pano')

  const googleMapsConfigured = getGoogleMapsApiKey() != null

  const isProviderEnableBlocked = (providerId: ProviderId): boolean => {
    if (!isBrowserAvailableProvider(providerId)) {
      return true
    }
    return providerId === 'streetview' && !googleMapsConfigured
  }

  const setProviderEnabled = (providerId: ProviderId, enabled: boolean) => {
    if (enabled && isProviderEnableBlocked(providerId)) {
      return
    }

    const next = enabled
      ? search.providers.includes(providerId)
        ? search.providers
        : [...search.providers, providerId]
      : search.providers.filter((id) => id !== providerId)

    updateProviders(next)
  }

  const togglePhotoType = (type: 'flat' | 'pano', checked: boolean) => {
    const next = new Set(search.photoTypes)
    if (checked) {
      next.add(type)
    } else {
      next.delete(type)
    }

    // Unchecking the last type resets to both, but skip the no-op navigation.
    const resolved = next.size > 0 ? [...next] : [...DEFAULT_PHOTO_TYPES]
    const isSameAsCurrent =
      resolved.length === search.photoTypes.length &&
      resolved.every((type) => photoTypeSet.has(type))
    if (isSameAsCurrent) {
      return
    }
    updatePhotoTypes(resolved)
  }

  if (!isOpen) {
    return (
      <button
        aria-label="Show navigation"
        className="absolute top-3 left-3 z-10 flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        type="button"
        onClick={() => {
          updateLeftPanel('open')
        }}
      >
        <PanelOpenIcon />
      </button>
    )
  }

  return (
    <aside
      ref={ref}
      className="group/panel relative flex h-full w-(--left-panel-width) max-w-[480px] shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left panel"
        className="absolute top-0 right-0 bottom-0 z-30 w-2 cursor-col-resize touch-none bg-slate-400/70 opacity-0 transition-opacity select-none group-hover/panel:opacity-100 active:opacity-100"
        onPointerDown={onResizeHandlePointerDown}
      />
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-slate-900">
            Street-Level Imagery Provider Overview
          </h1>
          <button
            aria-label="Hide navigation"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            type="button"
            onClick={() => {
              updateLeftPanel('closed')
            }}
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Explore and compare street-level imagery from multiple open and commercial providers on
          one map. Toggle providers and switch visualization styles to see coverage at a glance.{' '}
          <a
            className="text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500"
            href="https://github.com/osmberlin/street-level-imagery-provider-overview"
            rel="noreferrer"
            target="_blank"
          >
            Source on GitHub
          </a>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <section>
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Providers
          </h2>
          <ul className="mt-3 space-y-2">
            {PROVIDERS.map((provider) => {
              const checked = activeProviders.has(provider.id)
              const meta = providerById[provider.id]
              const adapter = adapterById[provider.id]
              const clickOnly = isClickOnlyPhotoProvider(provider.id)
              const belowMinZoom = !clickOnly && currentZoom < meta.minZoom
              const browserUnavailable = adapter.browserUnavailableReason != null
              const streetViewNeedsKey = provider.id === 'streetview' && !googleMapsConfigured
              const enableBlocked = browserUnavailable || streetViewNeedsKey
              const checkboxDisabled = enableBlocked && !checked
              return (
                <li key={provider.id}>
                  <div
                    className={twMerge(
                      'flex items-center justify-between gap-1 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50',
                      checkboxDisabled && 'opacity-60',
                    )}
                  >
                    <label
                      className={twMerge(
                        'flex min-w-0 flex-1 items-center gap-3 px-2 py-2',
                        checkboxDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                      title={
                        streetViewNeedsKey
                          ? 'Set GOOGLE_MAPS_API_KEY in src/config.ts'
                          : browserUnavailable
                            ? adapter.browserUnavailableReason
                            : undefined
                      }
                    >
                      <input
                        checked={checked}
                        className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:cursor-not-allowed"
                        disabled={checkboxDisabled}
                        type="checkbox"
                        onChange={(event) => {
                          setProviderEnabled(provider.id, event.target.checked)
                        }}
                      />
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: provider.color }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium text-slate-800">{provider.label}</span>
                        {streetViewNeedsKey ? (
                          <span className="text-xs text-slate-500">
                            Set GOOGLE_MAPS_API_KEY in src/config.ts
                          </span>
                        ) : browserUnavailable ? (
                          <span className="text-xs text-slate-500">
                            Unavailable in browser (CORS)
                          </span>
                        ) : clickOnly ? (
                          <span className="text-xs text-slate-500">Click map for link-out</span>
                        ) : belowMinZoom ? (
                          <span className="text-xs text-slate-500">
                            Zoom in to see data (z{meta.minZoom}+)
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <a
                      aria-label={`Open ${provider.label} at map center`}
                      className="shrink-0 p-2 text-slate-400 hover:text-slate-600"
                      href={providerLocationLink(provider.id, mapLat, mapLng, currentZoom)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Filters</h2>
          <div className="mt-3 space-y-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  checked={flatChecked}
                  className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  type="checkbox"
                  onChange={(event) => {
                    togglePhotoType('flat', event.target.checked)
                  }}
                />
                Flat
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  checked={panoChecked}
                  className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  type="checkbox"
                  onChange={(event) => {
                    togglePhotoType('pano', event.target.checked)
                  }}
                />
                Panorama
              </label>
            </div>

            {search.providers.includes('mapillary-signs') ? (
              <fieldset>
                <legend className="mb-1 text-xs text-slate-600">Mapillary signs</legend>
                <div className="flex flex-wrap gap-1">
                  {SIGN_GROUP_IDS.map((group) => {
                    const on = search.signGroups.includes(group)
                    return (
                      <button
                        aria-pressed={on}
                        className={`rounded-full border px-2 py-0.5 text-xs ${on ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
                        key={group}
                        onClick={() => {
                          updateSearch({
                            signGroups: on
                              ? search.signGroups.filter((id) => id !== group)
                              : SIGN_GROUP_IDS.filter(
                                  (id) => id === group || search.signGroups.includes(id),
                                ),
                          })
                        }}
                        type="button"
                      >
                        {SIGN_GROUP_LABELS[group]}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                From
                <input
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                  type="date"
                  value={search.date?.from ?? ''}
                  onChange={(event) => {
                    const from = event.target.value || undefined
                    updateDate({ ...search.date, from })
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                To
                <input
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                  type="date"
                  value={search.date?.to ?? ''}
                  onChange={(event) => {
                    const to = event.target.value || undefined
                    updateDate({ ...search.date, to })
                  }}
                />
              </label>
            </div>

            <div className="flex gap-3">
              {search.date.from !== defaultDateFrom() || search.date.to ? (
                <button
                  className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  type="button"
                  onClick={() => {
                    updateDate({ from: defaultDateFrom() })
                  }}
                >
                  Last {DEFAULT_MAX_AGE_YEARS} years
                </button>
              ) : null}
              {search.date.from || search.date.to ? (
                <button
                  className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  type="button"
                  onClick={() => {
                    updateDate({})
                  }}
                >
                  All dates
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Map style
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((option) => {
              const selected = search.style === option.value
              return (
                <button
                  key={option.value}
                  className={twMerge(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                  )}
                  type="button"
                  onClick={() => {
                    updateStyle(option.value)
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Legends</h2>
          {enabledProviders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Enable a provider to see legend counts.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {enabledProviders.map((provider) => (
                <li key={provider.id}>
                  <ProviderLegend
                    bbox={bbox}
                    date={search.date}
                    photoTypes={search.photoTypes}
                    providerId={provider.id}
                    style={search.style}
                    zoom={currentZoom}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}
