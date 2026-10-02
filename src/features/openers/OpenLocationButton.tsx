import {
  openLocationInNewTab,
  type LocationOpener,
  type OpenTarget,
} from '@osm-editor-kit/street-imagery'
import {
  useArmedLocationOpenerId,
  useLocationPickActions,
} from '@osm-editor-kit/street-imagery-react'
import type { MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAppI18n } from '@/i18n/useAppI18n'

// Heroicons "cursor-arrow-rays" (24, outline).
const CursorArrowRaysIcon = () => (
  <svg
    aria-hidden
    className="size-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
  </svg>
)

type OpenLocationButtonProps = {
  opener: LocationOpener
  /** The place is known already (a selected feature, the last click): open it right away. */
  location?: OpenTarget
  /** "Good enough" place for Shift+click when there is no `location`, e.g. the map center. */
  quickLocation?: OpenTarget
  /** Only the icon, for rows that show the service's name already. */
  iconOnly?: boolean
  className?: string
}

const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900'

const ICON_ONLY_CLASS = 'size-8 shrink-0 justify-center px-0 py-0'

/**
 * Opens a place in another imagery service. With a `location` it is a link that opens right
 * away. Without one it arms "pick on the map": the next map click opens the clicked place.
 */
export const OpenLocationButton = ({
  opener,
  location,
  quickLocation,
  iconOnly = false,
  className,
}: OpenLocationButtonProps) => {
  const { t } = useAppI18n()
  const label = t.opener.openIn(opener.label)
  const armedOpenerId = useArmedLocationOpenerId()
  const { toggle, disarm } = useLocationPickActions()
  const armed = armedOpenerId === opener.id

  if (location) {
    const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
      // Plain link for openers without a look-at lookup, and for "open in new window" clicks.
      if (!opener.lookAtUrl || event.metaKey || event.ctrlKey || event.shiftKey) {
        return
      }
      event.preventDefault()
      openLocationInNewTab(opener, location)
    }

    return (
      <a
        aria-label={iconOnly ? label : undefined}
        className={twMerge(BUTTON_CLASS, iconOnly && ICON_ONLY_CLASS, className)}
        title={iconOnly ? label : undefined}
        href={opener.locationUrl(location)}
        rel="noopener"
        target="_blank"
        onClick={handleLinkClick}
      >
        <CursorArrowRaysIcon />
        {iconOnly ? null : label}
      </a>
    )
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.shiftKey && quickLocation) {
      disarm()
      openLocationInNewTab(opener, quickLocation)
      return
    }
    toggle(opener.id)
  }

  return (
    <button
      aria-label={iconOnly ? label : undefined}
      aria-pressed={armed}
      className={twMerge(
        BUTTON_CLASS,
        iconOnly && ICON_ONLY_CLASS,
        armed && 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white',
        className,
      )}
      title={`${label}: ${t.opener.pickHint}${quickLocation ? ` ${t.opener.shiftHint}` : ''}`}
      type="button"
      onClick={handleClick}
    >
      <CursorArrowRaysIcon />
      {iconOnly ? null : label}
    </button>
  )
}
