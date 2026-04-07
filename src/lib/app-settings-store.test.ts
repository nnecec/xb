import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY, DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { createAppSettingsStore } from '@/lib/app-settings-store'

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

describe('app-settings-store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates persisted settings into the store', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
    })
    const store = createAppSettingsStore(storage)

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      theme: 'dark',
      rewriteEnabled: false,
      homeTimelineTab: 'following',
      isHydrated: true,
    })
  })

  it('updates memory first and persists tab changes', async () => {
    const storage = createStorageArea()
    const store = createAppSettingsStore(storage)

    await store.getState().setHomeTimelineTab('following')

    expect(store.getState().homeTimelineTab).toBe('following')
    expect(storage.read()).toEqual({
      ...DEFAULT_APP_SETTINGS,
      homeTimelineTab: 'following',
    })
  })
})
