import { createFileRoute, redirect } from '@tanstack/react-router'
import { routerSearch } from '@/app/routerSearch'
import { appSearchSchema, parseAppSearch, serializeAppSearch } from '@/app/searchSchema'

export const Route = createFileRoute('/')({
  validateSearch: appSearchSchema,
  beforeLoad: ({ location }) => {
    // Legacy dirty share links used JSON objects for `map`. Rewrite once to slash form.
    const raw = routerSearch.parse(location.searchStr) as Record<string, unknown>
    if (raw.map != null && typeof raw.map === 'object') {
      throw redirect({
        to: '/',
        search: serializeAppSearch(parseAppSearch(raw)),
        replace: true,
      })
    }
  },
  component: IndexPage,
})

function IndexPage() {
  // App UI lives in AppShell on the root route; index owns search params.
  return null
}
