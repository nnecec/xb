import { describe, expect, it, vi } from 'vitest'

import {
  createRewriteSettingsStore,
  DEFAULT_REWRITE_SETTINGS,
  loadRewriteSettings,
  normalizeRewriteSettings,
  persistRewriteSettings,
  resolveIsDarkMode,
  REWRITE_SETTINGS_STORAGE_KEY,
} from '@/features/weibo/settings/rewrite-settings'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      [REWRITE_SETTINGS_STORAGE_KEY]: stored,
    })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      stored = items[REWRITE_SETTINGS_STORAGE_KEY]
    }),
    read() {
      return stored
    },
  }
}

describe('rewrite-settings', () => {
  it('normalizes invalid values to the defaults', () => {
    expect(normalizeRewriteSettings(null)).toEqual(DEFAULT_REWRITE_SETTINGS)
    expect(normalizeRewriteSettings({ theme: 'unknown' })).toEqual(DEFAULT_REWRITE_SETTINGS)
  })

  it('loads and persists settings through storage', async () => {
    const storage = createStorageArea({
      enabled: false,
      theme: 'dark',
    })

    expect(await loadRewriteSettings(storage)).toEqual({
      enabled: false,
      theme: 'dark',
    })

    await persistRewriteSettings({
      enabled: true,
      theme: 'light',
    }, storage)

    expect(storage.set).toHaveBeenCalledWith({
      [REWRITE_SETTINGS_STORAGE_KEY]: {
        enabled: true,
        theme: 'light',
      },
    })
    expect(storage.read()).toEqual({
      enabled: true,
      theme: 'light',
    })
  })

  it('updates the store snapshot before persisting', async () => {
    const storage = createStorageArea()
    const store = createRewriteSettingsStore(DEFAULT_REWRITE_SETTINGS, storage)
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    await store.update({
      enabled: false,
      theme: 'dark',
    })

    expect(store.getSnapshot()).toEqual({
      enabled: false,
      theme: 'dark',
    })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.dispose()
  })

  it('resolves system theme against the preferred color scheme', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })
})
