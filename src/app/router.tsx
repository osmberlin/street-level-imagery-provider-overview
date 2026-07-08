import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { AppShell } from '@/app/AppShell'
import { routerSearch } from '@/app/routerSearch'
import { appSearchSchema } from '@/app/searchSchema'

const BASE_PATH = '/streetlevel-imagery-provider-overview'

const rootRoute = createRootRoute({
  validateSearch: appSearchSchema,
  beforeLoad: ({ location }) => {
    const { pathname, searchStr, hash } = location
    if (pathname.length <= 1 || !pathname.endsWith('/')) return
    const stripped = pathname.replace(/\/+$/, '') || '/'
    throw redirect({
      href: `${stripped}${searchStr}${hash ? `#${hash}` : ''}`,
      replace: true,
    })
  },
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({
  routeTree,
  basepath: BASE_PATH,
  trailingSlash: 'never',
  parseSearch: routerSearch.parse,
  stringifySearch: routerSearch.stringify,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
