import { openExternalUrl } from '@osm-editor-kit/street-imagery'
import type { ComponentPropsWithoutRef, MouseEvent } from 'react'

type ExternalLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'target' | 'rel'> & {
  href: string
}

/**
 * A link to another website. A plain click opens it in a separate window (`openLinksIn` in
 * `main.tsx`); with a modifier key, a middle click or without JavaScript it is a normal link that
 * opens a new tab.
 */
export const ExternalLink = ({ href, onClick, children, ...props }: ExternalLinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }
    event.preventDefault()
    openExternalUrl(href)
  }

  return (
    <a {...props} href={href} rel="noreferrer" target="_blank" onClick={handleClick}>
      {children}
    </a>
  )
}
