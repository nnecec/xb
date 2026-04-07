import { AppTheme } from '@/lib/app-settings'

export type ThemeMode = 'light' | 'dark'

export function resolveThemeMode(theme: AppTheme, systemPrefersDark: boolean): ThemeMode {
  if (theme === 'light') {
    return 'light'
  }

  if (theme === 'dark') {
    return 'dark'
  }

  return systemPrefersDark ? 'dark' : 'light'
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
}
