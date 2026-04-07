import { applyPageTakeover, clearPageTakeover } from '@/features/weibo/content/page-takeover'
import { resolveIsDarkMode } from '@/lib/app-settings'
import type { AppSettingsStore } from '@/lib/app-settings-store'

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
      applyPageTakeover(appRoot)
      return
    }

    clearPageTakeover(appRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  applyShellState()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    clearPageTakeover(appRoot)
  }
}
