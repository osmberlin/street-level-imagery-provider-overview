export const LEFT_PANEL_WIDTH_STORAGE_KEY = 'slipo-left-panel-width'

export const LEFT_PANEL_WIDTH_DEFAULT = 320
export const LEFT_PANEL_WIDTH_MIN = 240
export const LEFT_PANEL_WIDTH_MAX = 480

export const clampLeftPanelWidth = (width: number) =>
  Math.min(LEFT_PANEL_WIDTH_MAX, Math.max(LEFT_PANEL_WIDTH_MIN, width))

export const readLeftPanelWidth = () => {
  const raw = localStorage.getItem(LEFT_PANEL_WIDTH_STORAGE_KEY)
  if (!raw) return LEFT_PANEL_WIDTH_DEFAULT

  const width = Number(raw)
  if (!Number.isFinite(width)) return LEFT_PANEL_WIDTH_DEFAULT

  return clampLeftPanelWidth(width)
}

export const writeLeftPanelWidth = (width: number) => {
  localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(clampLeftPanelWidth(width)))
}
