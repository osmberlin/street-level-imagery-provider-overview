import { type PointerEvent as ReactPointerEvent, useLayoutEffect, useRef } from 'react'
import {
  clampLeftPanelWidth,
  readLeftPanelWidth,
  writeLeftPanelWidth,
} from './leftPanelWidthStorage'

const setLeftPanelWidthCssVar = (width: number) =>
  document.documentElement.style.setProperty('--left-panel-width', `${width}px`)

export function useResizableLeftPanelWidth() {
  const panelRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(function syncLeftPanelWidthCssVar() {
    const width = readLeftPanelWidth()
    setLeftPanelWidthCssVar(width)
  }, [])

  const onResizeHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current
    if (!panel) return

    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)

    const startX = event.clientX
    const startWidth = panel.offsetWidth
    let currentWidth = startWidth

    const onPointerMove = (move: globalThis.PointerEvent) => {
      currentWidth = clampLeftPanelWidth(startWidth + (move.clientX - startX))
      setLeftPanelWidthCssVar(currentWidth)
    }

    const end = () => {
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      writeLeftPanelWidth(currentWidth)
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  return { ref: panelRef, onResizeHandlePointerDown }
}
