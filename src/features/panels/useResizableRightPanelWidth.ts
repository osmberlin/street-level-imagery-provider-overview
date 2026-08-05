import { type PointerEvent as ReactPointerEvent, useLayoutEffect, useRef } from 'react'
import {
  clampRightPanelWidth,
  readRightPanelWidth,
  writeRightPanelWidth,
} from './rightPanelWidthStorage'

const setRightPanelWidthCssVar = (width: number) =>
  document.documentElement.style.setProperty('--right-panel-width', `${width}px`)

export function useResizableRightPanelWidth() {
  const panelRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(function syncRightPanelWidthCssVar() {
    const width = readRightPanelWidth()
    setRightPanelWidthCssVar(width)
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
      currentWidth = clampRightPanelWidth(startWidth + (startX - move.clientX))
      setRightPanelWidthCssVar(currentWidth)
    }

    const end = () => {
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      writeRightPanelWidth(currentWidth)
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  return { ref: panelRef, onResizeHandlePointerDown }
}
