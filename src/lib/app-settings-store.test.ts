import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY, DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { bindAppSettingsStorageSync, createAppSettingsStore } from '@/lib/app-settings-store'

interface Deferred<T = void> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T = void>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve']
  let reject!: Deferred<T>['reject']
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

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

function createDelayedStorageArea(initialValue?: unknown) {
  let stored = initialValue
  const pendingSets: Array<{
    items: Record<string, unknown>
    deferred: Deferred
  }> = []

  return {
    get: vi.fn(async () => ({
      [APP_SETTINGS_STORAGE_KEY]: stored,
    })),
    set: vi.fn((items: Record<string, unknown>) => {
      const deferred = createDeferred()
      pendingSets.push({ items, deferred })
      return deferred.promise.then(() => {
        stored = items[APP_SETTINGS_STORAGE_KEY]
      })
    }),
    pendingSets,
    read() {
      return stored
    },
  }
}

function createStorageChanges() {
  let listener:
    | ((changes: Record<string, { newValue?: unknown }>, areaName: string) => void)
    | null = null

  return {
    addListener: vi.fn((nextListener) => {
      listener = nextListener
    }),
    removeListener: vi.fn((nextListener) => {
      if (listener === nextListener) listener = null
    }),
    emit(changes: Record<string, { newValue?: unknown }>, areaName = 'local') {
      listener?.(changes, areaName)
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
    })
    const store = createAppSettingsStore(storage)

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      theme: 'dark',
      rewriteEnabled: false,
      isHydrated: true,
    })
  })

  it('updates memory first and persists rewrite changes', async () => {
    const storage = createStorageArea()
    const store = createAppSettingsStore(storage)

    await store.getState().updateSettings({ rewriteEnabled: false })

    expect(store.getState().rewriteEnabled).toBe(false)
    expect(storage.read()).toEqual({
      ...DEFAULT_APP_SETTINGS,
      rewriteEnabled: false,
    })
  })

  it('serializes overlapping settings writes so older storage calls cannot revert newer state', async () => {
    const storage = createDelayedStorageArea()
    const store = createAppSettingsStore(storage)

    const first = store.getState().updateSettings({ theme: 'dark' })
    await vi.waitFor(() => expect(storage.pendingSets).toHaveLength(1))

    const second = store.getState().updateSettings({ rewriteEnabled: false })
    expect(storage.pendingSets).toHaveLength(1)

    storage.pendingSets[0]!.deferred.resolve()
    await first
    await vi.waitFor(() => expect(storage.pendingSets).toHaveLength(2))

    storage.pendingSets[1]!.deferred.resolve()
    await second

    expect(storage.read()).toEqual({
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
      rewriteEnabled: false,
    })
  })

  it('serializes helper writes with later settings updates without losing array values', async () => {
    const storage = createDelayedStorageArea()
    const store = createAppSettingsStore(storage)
    const theme = {
      id: 'theme-1',
      name: 'Test Theme',
      lightCss: ':root { --background: white; }',
      darkCss: ':root { --background: black; }',
    }

    const first = store.getState().addUserTheme(theme)
    await vi.waitFor(() => expect(storage.pendingSets).toHaveLength(1))

    const second = store.getState().updateSettings({ theme: 'dark' })
    expect(storage.pendingSets).toHaveLength(1)

    storage.pendingSets[0]!.deferred.resolve()
    await first
    await vi.waitFor(() => expect(storage.pendingSets).toHaveLength(2))

    storage.pendingSets[1]!.deferred.resolve()
    await second

    expect(storage.read()).toEqual({
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
      userThemes: [theme],
    })
  })

  it('keeps theme creation idempotent and applies active theme CSS in one write', async () => {
    const storage = createStorageArea()
    const store = createAppSettingsStore(storage)
    const theme = {
      id: 'theme-1',
      name: 'Test Theme',
      lightCss: ':root { --background: white; }',
      darkCss: ':root { --background: black; }',
    }

    await store.getState().addUserTheme(theme)
    await store.getState().addUserTheme(theme)
    expect(store.getState().userThemes).toEqual([theme])

    await store.getState().updateSettings({
      selectedThemeType: 'custom',
      selectedThemeId: theme.id,
      customThemeLightCss: theme.lightCss,
      customThemeDarkCss: theme.darkCss,
    })
    await store.getState().updateUserTheme(theme.id, {
      lightCss: ':root { --background: ivory; }',
    })

    expect(storage.read()).toMatchObject({
      userThemes: [{ ...theme, lightCss: ':root { --background: ivory; }' }],
      customThemeLightCss: ':root { --background: ivory; }',
      customThemeDarkCss: theme.darkCss,
    })
  })

  it('merges a stale tab patch into the latest persisted snapshot', async () => {
    const storage = createStorageArea()
    const firstStore = createAppSettingsStore(storage)
    const staleStore = createAppSettingsStore(storage)

    await Promise.all([firstStore.getState().hydrate(), staleStore.getState().hydrate()])
    await firstStore.getState().updateSettings({ uiFontSize: 20 })
    await staleStore.getState().updateSettings({ theme: 'dark' })

    expect(storage.read()).toEqual({
      ...DEFAULT_APP_SETTINGS,
      uiFontSize: 20,
      theme: 'dark',
    })
  })

  it('syncs external local storage changes and removes the listener', () => {
    const storage = createStorageArea()
    const storageChanges = createStorageChanges()
    const store = createAppSettingsStore(storage)
    const cleanup = bindAppSettingsStorageSync(store, storageChanges)

    storageChanges.emit({
      [APP_SETTINGS_STORAGE_KEY]: {
        newValue: {
          uiFontSize: 20,
          contentFontSize: 32,
        },
      },
    })
    expect(store.getState()).toMatchObject({ uiFontSize: 20, contentFontSize: 32 })

    storageChanges.emit(
      {
        [APP_SETTINGS_STORAGE_KEY]: { newValue: { uiFontSize: 12 } },
      },
      'sync',
    )
    expect(store.getState().uiFontSize).toBe(20)

    cleanup()
    expect(storageChanges.removeListener).toHaveBeenCalledTimes(1)
    storageChanges.emit({
      [APP_SETTINGS_STORAGE_KEY]: { newValue: { uiFontSize: 12 } },
    })
    expect(store.getState().uiFontSize).toBe(20)
  })
})
