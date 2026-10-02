import { useAppSearchNavigation } from '@/app/searchNavigation'
import { APP_MESSAGES } from '@/i18n/messages'

/** Language from the URL (`locale`) and the app's texts in it. */
export const useAppI18n = () => {
  const { search } = useAppSearchNavigation()
  return { locale: search.locale, t: APP_MESSAGES[search.locale] }
}
