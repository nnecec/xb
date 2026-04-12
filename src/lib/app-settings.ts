export type AppTheme = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: AppTheme
  rewriteEnabled: boolean
}

export interface AppSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export const APP_SETTINGS_STORAGE_KEY = 'xb:app-settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  rewriteEnabled: true,
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  const candidate = value as Partial<AppSettings>

  return {
    theme: isAppTheme(candidate.theme) ? candidate.theme : DEFAULT_APP_SETTINGS.theme,
    rewriteEnabled:
      typeof candidate.rewriteEnabled === 'boolean'
        ? candidate.rewriteEnabled
        : DEFAULT_APP_SETTINGS.rewriteEnabled,
  }
}

export function resolveIsDarkMode(theme: AppTheme, prefersDark: boolean): boolean {
  if (theme === 'dark') {
    return true
  }

  if (theme === 'light') {
    return false
  }

  return prefersDark
}

export async function loadAppSettings(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const stored = await storageArea.get(APP_SETTINGS_STORAGE_KEY)
  return normalizeAppSettings(stored[APP_SETTINGS_STORAGE_KEY])
}

export async function persistAppSettings(
  nextValue: AppSettings,
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const normalized = normalizeAppSettings(nextValue)

  await storageArea.set({
    [APP_SETTINGS_STORAGE_KEY]: normalized,
  })

  return normalized
}
