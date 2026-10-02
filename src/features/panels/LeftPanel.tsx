import { getBingMapsKey, getGoogleMapsApiKey } from '@osm-editor-kit/street-imagery'
import {
  adapterById,
  isBrowserAvailableProvider,
  isClickOnlyPhotoProvider,
  providerCoversBbox,
  PROVIDERS,
  type OpenTarget,
  providerById,
  type ProviderId,
} from '@osm-editor-kit/street-imagery'
import { getLocationOpeners, STREET_IMAGERY_LOCALES } from '@osm-editor-kit/street-imagery'
import { useMapViewportBbox } from '@osm-editor-kit/street-imagery-react'
import { twMerge } from 'tailwind-merge'
import { ExternalLink } from '@/app/ExternalLink'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import type { AppSearch } from '@/app/searchSchema'
import {
  DEFAULT_MAX_AGE_YEARS,
  DEFAULT_PHOTO_TYPES,
  defaultDateFrom,
  isProviderId,
  SIGN_GROUP_IDS,
} from '@/app/searchSchema'
import { MAIN_MAP_ID } from '@/features/map/constants'
import { OpenLocationButton } from '@/features/openers/OpenLocationButton'
import { ProviderLegend } from '@/features/panels/ProviderLegend'
import { useResizableLeftPanelWidth } from '@/features/panels/useResizableLeftPanelWidth'
import { useAppI18n } from '@/i18n/useAppI18n'

/** Shown after the other providers: little or no coverage for most users. */
const LAST_PROVIDER_IDS: ProviderId[] = ['kartaview', 'mapilio', 'vegbilder']
const ORDERED_PROVIDERS = [
  ...PROVIDERS.filter((provider) => !LAST_PROVIDER_IDS.includes(provider.id)),
  ...LAST_PROVIDER_IDS.flatMap((id) => PROVIDERS.filter((provider) => provider.id === id)),
]

const pillClass = (on: boolean) =>
  `rounded-full border px-2 py-0.5 text-xs ${on ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`

const STYLE_MODES: AppSearch['style'][] = ['photoType', 'age']

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
  const { locale, t } = useAppI18n()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, map)
  const activeProviders = new Set(search.providers)
  const currentZoom = map.zoom
  const quickLocation: OpenTarget = { lngLat: [map.lng, map.lat], zoom: map.zoom }
  const isOpen = search.leftPanel !== 'closed'
  const locationOpeners = getLocationOpeners()

  const photoTypeSet = new Set(search.photoTypes)
  const flatChecked = photoTypeSet.has('flat')
  const panoChecked = photoTypeSet.has('pano')

  const googleMapsConfigured = getGoogleMapsApiKey() != null
  const bingMapsConfigured = getBingMapsKey() != null

  const isProviderEnableBlocked = (providerId: ProviderId): boolean => {
    if (!isBrowserAvailableProvider(providerId)) {
      return true
    }
    return (
      (providerId === 'streetview' && !googleMapsConfigured) ||
      (providerId === 'streetside' && !bingMapsConfigured)
    )
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
        aria-label={t.app.showNavigation}
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
        aria-label={t.app.resizePanel}
        className="absolute top-0 right-0 bottom-0 z-30 w-2 cursor-col-resize touch-none bg-slate-400/70 opacity-0 transition-opacity select-none group-hover/panel:opacity-100 active:opacity-100"
        onPointerDown={onResizeHandlePointerDown}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Stays in place while the rest of the panel scrolls. */}
        <div className="sticky top-0 z-20 flex items-start gap-2 border-b border-slate-200 bg-white py-3 pr-3 pl-5">
          <h1 className="min-w-0 flex-1 text-base leading-tight font-semibold tracking-tight text-slate-900">
            {t.app.title}
          </h1>
          <div
            aria-label={t.app.language}
            className="mt-0.5 flex shrink-0 overflow-hidden rounded-md border border-slate-200 text-xs font-medium"
            role="group"
          >
            {STREET_IMAGERY_LOCALES.map((option) => (
              <button
                aria-pressed={locale === option}
                className={twMerge(
                  'px-1.5 py-1 uppercase',
                  locale === option
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50',
                )}
                key={option}
                lang={option}
                type="button"
                onClick={() => {
                  updateSearch({ locale: option }, { replace: true })
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            aria-label={t.app.hideNavigation}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            type="button"
            onClick={() => {
              updateLeftPanel('closed')
            }}
          >
            <CloseIcon />
          </button>
        </div>
        <p className="px-5 pt-3 text-sm leading-snug text-slate-600">
          {t.app.intro}{' '}
          <ExternalLink
            className="text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500"
            href="https://github.com/osmberlin/street-level-imagery-provider-overview"
          >
            {t.app.sourceOnGitHub}
          </ExternalLink>
        </p>

        <div className="px-5 py-5">
          <section>
            <ul className="space-y-2">
              {ORDERED_PROVIDERS.map((provider) => {
                const checked = activeProviders.has(provider.id)
                const meta = providerById[provider.id]
                const adapter = adapterById[provider.id]
                const clickOnly = isClickOnlyPhotoProvider(provider.id)
                const belowMinZoom = !clickOnly && currentZoom < meta.minZoom
                const browserUnavailable = adapter.browserUnavailableReason != null
                const streetViewNeedsKey = provider.id === 'streetview' && !googleMapsConfigured
                // Providers with a coverage area (Vegbilder: Norway) are off elsewhere.
                const outsideCoverage = bbox != null && !providerCoversBbox(provider.id, bbox)
                const checkboxDisabled = (browserUnavailable || outsideCoverage) && !checked
                const opener = locationOpeners.find((candidate) => candidate.id === provider.id)
                const streetsideNeedsKey = provider.id === 'streetside' && !bingMapsConfigured
                // Nothing to show on the map (Apple; Google or Bing without a key): only the opener.
                if (opener && streetsideNeedsKey) {
                  return (
                    <li key={provider.id}>
                      <OpenLocationButton
                        className="w-full"
                        opener={opener}
                        quickLocation={quickLocation}
                      />
                    </li>
                  )
                }
                if (opener && !checked && (provider.id === 'lookaround' || streetViewNeedsKey)) {
                  return (
                    <li key={provider.id}>
                      <OpenLocationButton
                        className="w-full"
                        opener={opener}
                        quickLocation={quickLocation}
                      />
                    </li>
                  )
                }
                return (
                  <li
                    key={provider.id}
                    className="rounded-lg border border-slate-200 hover:bg-slate-50/60"
                  >
                    <div className="flex items-center gap-1 pr-1.5">
                      <label
                        className={twMerge(
                          'flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2',
                          checkboxDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                        )}
                        title={browserUnavailable ? t.providers.unavailableInBrowser : undefined}
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
                          <span className="text-sm font-medium text-slate-800">
                            {provider.label}
                          </span>
                          {outsideCoverage ? (
                            <span className="text-xs text-slate-500">
                              {t.providers.notAvailableHere(meta.coverage?.label ?? '')}
                            </span>
                          ) : clickOnly ? (
                            <span className="text-xs text-slate-500">
                              {t.providers.checksOnClick}
                            </span>
                          ) : belowMinZoom ? (
                            <span className="text-xs text-slate-500">
                              {t.providers.zoomIn(meta.minZoom)}
                            </span>
                          ) : null}
                        </span>
                      </label>
                      {opener && !outsideCoverage ? (
                        <OpenLocationButton
                          iconOnly
                          opener={opener}
                          quickLocation={quickLocation}
                        />
                      ) : null}
                    </div>
                    {checked && !clickOnly && !belowMinZoom && !outsideCoverage ? (
                      <div className="border-t border-slate-200 px-2.5 py-2">
                        <ProviderLegend
                          bbox={bbox}
                          date={search.date}
                          photoTypes={search.photoTypes}
                          providerId={provider.id}
                          style={search.style}
                          zoom={currentZoom}
                        />
                      </div>
                    ) : null}
                  </li>
                )
              })}
              {locationOpeners
                .filter((opener) => opener.isAvailable() && !isProviderId(opener.id))
                .map((opener) => (
                  <li key={opener.id}>
                    <OpenLocationButton
                      className="w-full"
                      opener={opener}
                      quickLocation={quickLocation}
                    />
                  </li>
                ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {t.filters.heading}
            </h2>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['flat', flatChecked, t.filters.flat],
                    ['pano', panoChecked, t.filters.panorama],
                  ] as const
                ).map(([type, on, label]) => (
                  <button
                    aria-pressed={on}
                    className={pillClass(on)}
                    key={type}
                    type="button"
                    onClick={() => {
                      togglePhotoType(type, !on)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {search.providers.includes('mapillary-signs') ? (
                <fieldset>
                  <legend className="mb-1 text-xs text-slate-600">{t.filters.signs}</legend>
                  <div className="flex flex-wrap gap-1">
                    {SIGN_GROUP_IDS.map((group) => {
                      const on = search.signGroups.includes(group)
                      return (
                        <button
                          aria-pressed={on}
                          className={pillClass(on)}
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
                          {t.filters.signGroup[group]}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  {t.filters.from}
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
                  {t.filters.to}
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
                    {t.filters.lastYears(DEFAULT_MAX_AGE_YEARS)}
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
                    {t.filters.allDates}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {t.style.heading}
            </h2>
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
              {STYLE_MODES.map((mode) => {
                const selected = search.style === mode
                return (
                  <button
                    aria-pressed={selected}
                    key={mode}
                    className={twMerge(
                      'px-3 py-1.5 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50',
                    )}
                    type="button"
                    onClick={() => {
                      updateStyle(mode)
                    }}
                  >
                    {t.style.mode[mode]}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}
