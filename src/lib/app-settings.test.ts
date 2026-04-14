import { describe, expect, it, vi } from 'vitest'

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  normalizeAppSettings,
  persistAppSettings,
  resolveIsDarkMode,
} from '@/lib/app-settings'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      [APP_SETTINGS_STORAGE_KEY]: stored,
    })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      stored = items[APP_SETTINGS_STORAGE_KEY]
    }),
    read() {
      return stored
    },
  }
}

describe('app-settings', () => {
  it('normalizes invalid values to the defaults', () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS)
    expect(
      normalizeAppSettings({
        theme: 'unknown',
        rewriteEnabled: 'no',
      }),
    ).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('loads and persists settings through storage', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      fontSize: 'small',
      fontFamily: 'Georgia',
      showHotSearchCard: false,
    })

    expect(await loadAppSettings(storage)).toEqual({
      theme: 'dark',
      rewriteEnabled: false,
      fontSize: 'small',
      fontFamily: 'Georgia',
      showHotSearchCard: false,
    })

    await persistAppSettings(
      {
        theme: 'light',
        rewriteEnabled: true,
        fontSize: 'large',
        fontFamily: 'system-ui',
        showHotSearchCard: true,
      },
      storage,
    )

    expect(storage.read()).toEqual({
      theme: 'light',
      rewriteEnabled: true,
      fontSize: 'large',
      fontFamily: 'system-ui',
      showHotSearchCard: true,
    })
  })

  it('resolves dark mode from theme preference', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })
})
