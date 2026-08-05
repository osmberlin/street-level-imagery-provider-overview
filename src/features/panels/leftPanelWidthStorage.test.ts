import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clampLeftPanelWidth,
  LEFT_PANEL_WIDTH_DEFAULT,
  LEFT_PANEL_WIDTH_MAX,
  LEFT_PANEL_WIDTH_MIN,
  LEFT_PANEL_WIDTH_STORAGE_KEY,
  readLeftPanelWidth,
  writeLeftPanelWidth,
} from './leftPanelWidthStorage'

describe('leftPanelWidthStorage', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    })
  })

  afterEach(() => {
    storage.clear()
    vi.unstubAllGlobals()
  })

  test('clampLeftPanelWidth limits to 240–480', () => {
    expect(clampLeftPanelWidth(100)).toBe(LEFT_PANEL_WIDTH_MIN)
    expect(clampLeftPanelWidth(600)).toBe(LEFT_PANEL_WIDTH_MAX)
    expect(clampLeftPanelWidth(360)).toBe(360)
  })

  test('readLeftPanelWidth returns default when storage is empty', () => {
    expect(readLeftPanelWidth()).toBe(LEFT_PANEL_WIDTH_DEFAULT)
  })

  test('writeLeftPanelWidth persists clamped width', () => {
    writeLeftPanelWidth(600)
    expect(storage.get(LEFT_PANEL_WIDTH_STORAGE_KEY)).toBe(String(LEFT_PANEL_WIDTH_MAX))
    expect(readLeftPanelWidth()).toBe(LEFT_PANEL_WIDTH_MAX)
  })
})
