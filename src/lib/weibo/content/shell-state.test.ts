import { describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { createAppSettingsStore } from '@/lib/app-settings-store'
import { resolveFontFamilyStack } from '@/lib/font-loader'
import { bindShellState } from '@/lib/weibo/content/shell-state'

vi.mock('@/lib/font-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/font-loader')>()
  return {
    ...actual,
    loadFont: vi.fn().mockResolvedValue(true),
  }
})

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

    await store.getState().updateSettings({ theme: 'dark', rewriteEnabled: false })

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

    await store.getState().updateSettings({ theme: 'dark' })

    expect(container.classList.contains('dark')).toBe(true)
    expect(appRoot.getAttribute('data-xb-hidden')).toBe('true')
    expect(document.documentElement.style.overflow).toBe('hidden')

    cleanup()

    expect(container.classList.contains('dark')).toBe(false)
    expect(appRoot.getAttribute('data-xb-hidden')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('auto')
  })

  it('applies custom theme variables for the active color mode', async () => {
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

    await store.getState().updateSettings({
      customThemeLightCss: '--primary: #111111; --background: #ffffff;',
      customThemeDarkCss: '--primary: #eeeeee; --background: #000000;',
    })

    expect(container.style.getPropertyValue('--primary')).toBe('#111111')
    expect(container.style.getPropertyValue('--background')).toBe('#ffffff')

    await store.getState().updateSettings({ theme: 'dark' })

    expect(container.style.getPropertyValue('--primary')).toBe('#eeeeee')
    expect(container.style.getPropertyValue('--background')).toBe('#000000')

    await store.getState().updateSettings({
      customThemeLightCss: '',
      customThemeDarkCss: '',
    })

    expect(container.style.getPropertyValue('--primary')).toBe('')
    expect(container.style.getPropertyValue('--background')).toBe('oklch(0.1908 0.002 106.59)')

    cleanup()
  })

  it('does not inject app font family when scope is content', async () => {
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

    await store.getState().updateSettings({
      fontFamilyClass: 'font-serif',
      fontApplyScope: 'content',
    })

    expect(container.style.fontFamily).toBe('')
    expect(container.style.getPropertyValue('--font-sans')).toBe('')

    cleanup()
  })

  it('injects font family on the shell when scope is app', async () => {
    const { loadFont } = await import('@/lib/font-loader')
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

    await store.getState().updateSettings({
      fontFamilyClass: 'font-lxgw-wenkai',
      fontApplyScope: 'app',
    })

    const stack = resolveFontFamilyStack('font-lxgw-wenkai')
    // style.fontFamily 会规范化引号；CSS 变量保留写入值
    expect(container.style.fontFamily).toContain('LXGW WenKai')
    expect(container.style.getPropertyValue('--font-sans')).toBe(stack)
    expect(container.style.getPropertyValue('--font-serif')).toBe(stack)
    expect(loadFont).toHaveBeenCalledWith('font-lxgw-wenkai')

    // User font setting overrides theme --font-sans
    await store.getState().updateSettings({
      customThemeLightCss: '--font-sans: Inter, sans-serif;',
    })
    expect(container.style.getPropertyValue('--font-sans')).toBe(stack)

    // 切回正文：去掉 font-family；主题 --font-sans 若存在则恢复（本例无主题字体）
    await store.getState().updateSettings({
      fontApplyScope: 'content',
      customThemeLightCss: '',
    })
    expect(container.style.fontFamily).toBe('')
    // 无主题字体时 --font-sans 应为空（主题变量已清空，应用模式也不再写入）
    expect(container.style.getPropertyValue('--font-sans')).toBe('')

    // 正文模式不得抹掉主题的 --font-sans
    await store.getState().updateSettings({
      fontApplyScope: 'content',
      customThemeLightCss: '--font-sans: Inter, sans-serif;',
    })
    expect(container.style.fontFamily).toBe('')
    expect(container.style.getPropertyValue('--font-sans')).toBe('Inter, sans-serif')

    cleanup()
  })

  it('clears app font family on unbind', async () => {
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

    await store.getState().updateSettings({
      fontFamilyClass: 'font-simhei',
      fontApplyScope: 'app',
    })

    expect(container.style.fontFamily).toContain('SimHei')
    expect(container.style.getPropertyValue('--font-sans')).toBe(
      resolveFontFamilyStack('font-simhei'),
    )

    cleanup()

    expect(container.style.fontFamily).toBe('')
    expect(container.style.getPropertyValue('--font-sans')).toBe('')
  })
})
