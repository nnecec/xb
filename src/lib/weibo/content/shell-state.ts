import { DARK_BG_PRESETS, LIGHT_BG_PRESETS, resolveIsDarkMode } from '@/lib/app-settings'
import type { AppSettingsStore } from '@/lib/app-settings-store'
import { CUSTOM_THEME_VARIABLE_NAMES, parseCustomThemeVariables } from '@/lib/custom-theme'
import { isRemoteFont, loadFont, resolveFontFamilyStack } from '@/lib/font-loader'
import {
  applyPageTakeover,
  clearPageTakeover,
  markWeiboPageReady,
} from '@/lib/weibo/content/page-takeover'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'

const OVERFLOW_STORAGE_KEY = 'data-xb-previous-overflow'

function isRouteSupported(): boolean {
  return parseWeiboUrl(window.location.href).kind !== 'unsupported'
}

function clearCustomThemeVariables(container: HTMLElement) {
  for (const variable of CUSTOM_THEME_VARIABLE_NAMES) {
    container.style.removeProperty(variable)
  }
}

/** 仅清除应用模式写入的字族；勿动主题 CSS 变量（由 clearCustomThemeVariables 管理） */
function clearAppFontFamily(container: HTMLElement) {
  container.style.removeProperty('font-family')
}

/**
 * 应用模式：把用户字族写到 shadow 容器根，覆盖主题 --font-sans/--font-serif。
 * 正文阅读尺度（字号/字重/行高）仍只走 useFontSettings，不在此注入。
 * 须在主题变量注入之后调用，以保证用户设置优先。
 */
function applyAppFontFamily(
  container: HTMLElement,
  fontFamilyClass: Parameters<typeof resolveFontFamilyStack>[0],
  scope: 'content' | 'app',
) {
  if (scope !== 'app') {
    // 正文模式：只去掉我们写的 font-family，保留主题 --font-sans 等
    clearAppFontFamily(container)
    return
  }

  const stack = resolveFontFamilyStack(fontFamilyClass)
  // 直接设 font-family：覆盖未使用 font-sans 的默认继承
  container.style.setProperty('font-family', stack)
  // 同步 token：组件/主题里 var(--font-sans) / Tailwind font-sans 也吃到同一栈
  // 主题若写了 --font-*，此处覆盖（用户字体设置优先）
  container.style.setProperty('--font-sans', stack)
  container.style.setProperty('--font-serif', stack)

  if (isRemoteFont(fontFamilyClass)) {
    void loadFont(fontFamilyClass)
  }
}

export function bindShellState({
  container,
  appRoot,
  settingsStore,
}: {
  container: HTMLElement
  appRoot: HTMLElement
  settingsStore: AppSettingsStore
}) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyShellState = () => {
    const settings = settingsStore.getState()
    const isDark = resolveIsDarkMode(settings.theme, mediaQuery.matches)

    container.classList.toggle('dark', isDark)
    clearCustomThemeVariables(container)

    // Apply background color preset CSS variables
    const preset = isDark
      ? DARK_BG_PRESETS.find((p) => p.key === settings.darkModeBgColor)
      : LIGHT_BG_PRESETS.find((p) => p.key === settings.lightModeBgColor)

    if (preset) {
      container.style.setProperty('--background', preset.background)
      container.style.setProperty('--card', preset.card)
    }

    const customThemeCss = isDark ? settings.customThemeDarkCss : settings.customThemeLightCss
    if (customThemeCss.trim()) {
      const variables = parseCustomThemeVariables(customThemeCss)
      for (const [name, value] of Object.entries(variables)) {
        container.style.setProperty(name, value)
      }
    }

    // 用户字体设置优先于主题 --font-*（在主题变量之后写入）
    applyAppFontFamily(container, settings.fontFamilyClass, settings.fontApplyScope)

    // When route is unsupported, release the host page and hide xb UI
    // so Weibo's native UI is visible and functional.
    if (!isRouteSupported()) {
      container.style.display = 'none'
      const previousOverflow = document.documentElement.getAttribute(OVERFLOW_STORAGE_KEY)
      document.documentElement.style.overflow =
        previousOverflow !== null && previousOverflow !== '' ? previousOverflow : 'auto'
      document.documentElement.removeAttribute(OVERFLOW_STORAGE_KEY)
      clearPageTakeover(appRoot)
      return
    }

    // Route is supported — make sure xb container is visible
    container.style.removeProperty('display')

    if (settings.rewriteEnabled) {
      if (!document.documentElement.hasAttribute(OVERFLOW_STORAGE_KEY)) {
        document.documentElement.setAttribute(
          OVERFLOW_STORAGE_KEY,
          document.documentElement.style.overflow || '',
        )
      }
      document.documentElement.style.overflow = 'hidden'
      applyPageTakeover(appRoot)
      return
    }

    const previousOverflow = document.documentElement.getAttribute(OVERFLOW_STORAGE_KEY)
    document.documentElement.style.overflow =
      previousOverflow !== null && previousOverflow !== '' ? previousOverflow : 'auto'
    document.documentElement.removeAttribute(OVERFLOW_STORAGE_KEY)
    clearPageTakeover(appRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  // Re-evaluate shell state when URL changes (SPA navigation)
  const onUrlChange = () => applyShellState()
  window.addEventListener('popstate', onUrlChange)

  // Also detect pushState/replaceState navigations by patching History methods.
  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args)
    onUrlChange()
  }
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplaceState(...args)
    onUrlChange()
  }

  applyShellState()
  markWeiboPageReady()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    window.removeEventListener('popstate', onUrlChange)
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
    container.classList.remove('dark')
    clearCustomThemeVariables(container)
    clearAppFontFamily(container)
    // 应用模式可能额外写过 --font-sans/--font-serif（在主题变量名之外的覆盖）
    container.style.removeProperty('--font-sans')
    container.style.removeProperty('--font-serif')
    container.style.removeProperty('display')
    const previousOverflow = document.documentElement.getAttribute(OVERFLOW_STORAGE_KEY)
    document.documentElement.style.overflow =
      previousOverflow !== null && previousOverflow !== '' ? previousOverflow : 'auto'
    document.documentElement.removeAttribute(OVERFLOW_STORAGE_KEY)
    clearPageTakeover(appRoot)
  }
}
