import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { serializeMapParam, type MapParam } from '@/app/mapParam'
import { parseAppSearch, serializeAppSearch, type AppSearch } from '@/app/searchSchema'

const rootRouteApi = getRouteApi('/')

type SearchUpdateOptions = {
  replace?: boolean
}

type AppSearchWrite = {
  [Key in keyof AppSearch]?: Key extends 'map' ? MapParam | string : AppSearch[Key]
}

export const mergeAppSearchForNavigate = (
  prev: AppSearch,
  updates: Partial<AppSearchWrite>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...prev }

  if ('providers' in updates) {
    next.providers = updates.providers
  }

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'providers') {
      continue
    }
    if (value === undefined) {
      delete next[key]
    } else if (key === 'map') {
      next.map = typeof value === 'string' ? value : serializeMapParam(value as MapParam)
    } else {
      next[key] = value
    }
  }

  const mapValue = next.map
  if (mapValue != null && typeof mapValue !== 'string') {
    next.map = serializeMapParam(mapValue as MapParam)
  }

  return next
}

export const useAppSearchNavigation = () => {
  const search = rootRouteApi.useSearch()
  const navigate = useNavigate({ from: '/' })

  const updateSearch = (
    partial: Partial<AppSearchWrite> | ((prev: AppSearch) => Partial<AppSearchWrite>),
    options?: SearchUpdateOptions,
  ) => {
    void navigate({
      search: (prev) => {
        const updates = typeof partial === 'function' ? partial(prev) : partial
        return mergeAppSearchForNavigate(prev, updates) as AppSearch
      },
      replace: options?.replace ?? false,
      resetScroll: false,
    })
  }

  const updateMapViewport = (map: MapParam) => {
    updateSearch({ map: serializeMapParam(map) }, { replace: true })
  }

  const updateProviders = (providers: AppSearch['providers']) => {
    const next = parseAppSearch({ ...search, providers })
    const serialized = serializeAppSearch(
      providers.length === 0 ? { ...next, clicked: undefined, selected: undefined } : next,
    )

    void navigate({
      search: serialized as AppSearch,
      replace: false,
      resetScroll: false,
    })
  }

  const updateStyle = (style: AppSearch['style']) => {
    updateSearch({ style }, { replace: false })
  }

  const updatePhotoTypes = (photoTypes: AppSearch['photoTypes']) => {
    updateSearch({ photoTypes }, { replace: false })
  }

  const updateDate = (date: AppSearch['date']) => {
    updateSearch({ date }, { replace: false })
  }

  const updateClicked = (clicked: AppSearch['clicked']) => {
    updateSearch({ clicked }, { replace: true })
  }

  const updateSelected = (selected: AppSearch['selected']) => {
    updateSearch({ selected }, { replace: true })
  }

  return {
    search,
    updateSearch,
    updateMapViewport,
    updateProviders,
    updateStyle,
    updatePhotoTypes,
    updateDate,
    updateClicked,
    updateSelected,
  }
}
