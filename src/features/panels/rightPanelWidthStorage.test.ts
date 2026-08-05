import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clampRightPanelWidth,
  readRightPanelWidth,
  RIGHT_PANEL_WIDTH_DEFAULT,
  RIGHT_PANEL_WIDTH_MAX,
  RIGHT_PANEL_WIDTH_MIN,
  RIGHT_PANEL_WIDTH_STORAGE_KEY,
  writeRightPanelWidth,
} from './rightPanelWidthStorage'

describe('rightPanelWidthStorage', () => {
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

  test('clampRightPanelWidth limits to 280–640', () => {
    expect(clampRightPanelWidth(100)).toBe(RIGHT_PANEL_WIDTH_MIN)
    expect(clampRightPanelWidth(800)).toBe(RIGHT_PANEL_WIDTH_MAX)
    expect(clampRightPanelWidth(400)).toBe(400)
  })

  test('readRightPanelWidth returns default when storage is empty', () => {
    expect(readRightPanelWidth()).toBe(RIGHT_PANEL_WIDTH_DEFAULT)
  })

  test('writeRightPanelWidth persists clamped width', () => {
    writeRightPanelWidth(800)
    expect(storage.get(RIGHT_PANEL_WIDTH_STORAGE_KEY)).toBe(String(RIGHT_PANEL_WIDTH_MAX))
    expect(readRightPanelWidth()).toBe(RIGHT_PANEL_WIDTH_MAX)
  })
})
