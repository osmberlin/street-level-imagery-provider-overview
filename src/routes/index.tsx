import { createFileRoute } from '@tanstack/react-router'
import { appSearchSchema } from '@/app/searchSchema'

export const Route = createFileRoute('/')({
  validateSearch: appSearchSchema,
  component: IndexPage,
})

function IndexPage() {
  // App UI lives in AppShell on the root route; index owns search params.
  return null
}
