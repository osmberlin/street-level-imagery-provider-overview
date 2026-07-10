import { twMerge } from 'tailwind-merge'
import { useAppSearchNavigation } from '@/app/searchNavigation'
import type { AppSearch } from '@/app/searchSchema'
import { DEFAULT_PHOTO_TYPES } from '@/app/searchSchema'
import { useMapViewportBbox } from '@/features/data/useMapViewportBbox'
import { ProviderLegend } from '@/features/panels/ProviderLegend'
import { PROVIDERS, providerById, type ProviderId } from '@/features/providers/registry'

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

export const LeftPanel = () => {
  const { search, updateProviders, updateStyle, updatePhotoTypes, updateDate } =
    useAppSearchNavigation()
  const bbox = useMapViewportBbox()
  const activeProviders = new Set(search.providers)
  const currentZoom = search.map.z
  const enabledProviders = PROVIDERS.filter((provider) => activeProviders.has(provider.id))

  const photoTypeSet = new Set(search.photoTypes)
  const flatChecked = photoTypeSet.has('flat')
  const panoChecked = photoTypeSet.has('pano')

  const toggleProvider = (providerId: ProviderId) => {
    const next = activeProviders.has(providerId)
      ? search.providers.filter((id) => id !== providerId)
      : [...search.providers, providerId]

    if (next.length === 0) {
      return
    }
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

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Street-Level Imagery Provider Overview
        </h1>
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
              const belowMinZoom = currentZoom < meta.minZoom
              return (
                <li key={provider.id}>
                  <div className="flex items-center justify-between gap-1 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-2">
                      <input
                        checked={checked}
                        className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        type="checkbox"
                        onChange={() => {
                          toggleProvider(provider.id)
                        }}
                      />
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: provider.color }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium text-slate-800">{provider.label}</span>
                        {belowMinZoom ? (
                          <span className="text-xs text-slate-500">
                            Zoom in to see data (z{meta.minZoom}+)
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {meta.homepageUrl ? (
                      <a
                        aria-label={`Open ${provider.label} website`}
                        className="shrink-0 p-2 text-slate-400 hover:text-slate-600"
                        href={meta.homepageUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLinkIcon />
                      </a>
                    ) : null}
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

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                From
                <input
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                  type="date"
                  value={search.date?.from ?? ''}
                  onChange={(event) => {
                    const from = event.target.value || undefined
                    updateDate(from || search.date?.to ? { ...search.date, from } : undefined)
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
                    updateDate(to || search.date?.from ? { ...search.date, to } : undefined)
                  }}
                />
              </label>
            </div>

            {search.date?.from || search.date?.to ? (
              <button
                className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                type="button"
                onClick={() => {
                  updateDate(undefined)
                }}
              >
                Clear dates
              </button>
            ) : null}
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
