import { AppAppearance } from '@/lib/app-settings'

export type ThemeMode = 'light' | 'dark'

export function resolveThemeMode(appearance: AppAppearance, systemPrefersDark: boolean): ThemeMode {
  if (appearance === 'light') {
    return 'light'
  }

  if (appearance === 'dark') {
    return 'dark'
  }

  return systemPrefersDark ? 'dark' : 'light'
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
}
