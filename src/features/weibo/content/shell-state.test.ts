import { describe, expect, it } from 'vitest'

import { bindShellState } from '@/features/weibo/content/shell-state'
import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { createAppSettingsStore } from '@/lib/app-settings-store'

describe('bindShellState', () => {
  it('applies dark mode and rewrite takeover from the shared store', async () => {
    const container = document.createElement('div')
    const appRoot = document.createElement('div')
    const store = createAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })

    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    })

    const cleanup = bindShellState({
      container,
      appRoot,
      settingsStore: store,
    })

    expect(document.documentElement.getAttribute('data-xb-weibo-ready')).toBe('')

    await store.getState().setTheme('dark')
    await store.getState().setRewriteEnabled(false)

    expect(container.classList.contains('dark')).toBe(true)
    expect(appRoot.getAttribute('data-xb-hidden')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('auto')

    cleanup()
  })

  it('cleans up takeover and dark mode classes on unbind', async () => {
    const container = document.createElement('div')
    const appRoot = document.createElement('div')
    const store = createAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })

    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    })

    const cleanup = bindShellState({
      container,
      appRoot,
      settingsStore: store,
    })

    await store.getState().setTheme('dark')

    expect(container.classList.contains('dark')).toBe(true)
    expect(appRoot.getAttribute('data-xb-hidden')).toBe('true')
    expect(document.documentElement.style.overflow).toBe('hidden')

    cleanup()

    expect(container.classList.contains('dark')).toBe(false)
    expect(appRoot.getAttribute('data-xb-hidden')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('auto')
  })
})
