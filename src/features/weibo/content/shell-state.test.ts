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

    await store.getState().setTheme('dark')
    await store.getState().setRewriteEnabled(false)

    expect(container.classList.contains('dark')).toBe(true)
    expect(appRoot.getAttribute('data-loveforxb-hidden')).toBeNull()

    cleanup()
  })
})
