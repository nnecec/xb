import {
  applyPageTakeover,
  clearPageTakeover,
  markWeiboPageReady,
} from '@/features/weibo/content/page-takeover'
import { resolveIsDarkMode } from '@/lib/app-settings'
import type { AppSettingsStore } from '@/lib/app-settings-store'

const OVERFLOW_STORAGE_KEY = 'data-xb-previous-overflow'

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
    document.documentElement.style.overflow = (previousOverflow !== null && previousOverflow !== '') ? previousOverflow : 'auto'
    document.documentElement.removeAttribute(OVERFLOW_STORAGE_KEY)
    clearPageTakeover(appRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  applyShellState()
  markWeiboPageReady()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    container.classList.remove('dark')
    const previousOverflow = document.documentElement.getAttribute(OVERFLOW_STORAGE_KEY)
    document.documentElement.style.overflow = (previousOverflow !== null && previousOverflow !== '') ? previousOverflow : 'auto'
    document.documentElement.removeAttribute(OVERFLOW_STORAGE_KEY)
    clearPageTakeover(appRoot)
  }
}
