export const RIGHT_PANEL_WIDTH_STORAGE_KEY = 'slipo-right-panel-width'

export const RIGHT_PANEL_WIDTH_DEFAULT = 384
export const RIGHT_PANEL_WIDTH_MIN = 280
export const RIGHT_PANEL_WIDTH_MAX = 640

export const clampRightPanelWidth = (width: number) =>
  Math.min(RIGHT_PANEL_WIDTH_MAX, Math.max(RIGHT_PANEL_WIDTH_MIN, width))

export const readRightPanelWidth = () => {
  const raw = localStorage.getItem(RIGHT_PANEL_WIDTH_STORAGE_KEY)
  if (!raw) return RIGHT_PANEL_WIDTH_DEFAULT

  const width = Number(raw)
  if (!Number.isFinite(width)) return RIGHT_PANEL_WIDTH_DEFAULT

  return clampRightPanelWidth(width)
}

export const writeRightPanelWidth = (width: number) => {
  localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(clampRightPanelWidth(width)))
}
