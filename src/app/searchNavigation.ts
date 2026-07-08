import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { AppSearch } from '@/app/searchSchema'

const rootRouteApi = getRouteApi('/')

type SearchUpdateOptions = {
  replace?: boolean
}

export const useAppSearchNavigation = () => {
  const search = rootRouteApi.useSearch()
  const navigate = useNavigate({ from: '/' })

  const updateSearch = (
    partial: Partial<AppSearch> | ((prev: AppSearch) => Partial<AppSearch>),
    options?: SearchUpdateOptions,
  ) => {
    void navigate({
      search: (prev) => {
        const updates = typeof partial === 'function' ? partial(prev) : partial
        const next: Record<string, unknown> = { ...prev }

        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) {
            delete next[key]
          } else {
            next[key] = value
          }
        }

        return next as AppSearch
      },
      replace: options?.replace ?? false,
      resetScroll: false,
    })
  }

  const updateMapViewport = (map: AppSearch['map']) => {
    updateSearch({ map }, { replace: true })
  }

  const updateProviders = (providers: AppSearch['providers']) => {
    updateSearch({ providers }, { replace: false })
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
