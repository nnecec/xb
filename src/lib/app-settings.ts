export type AppTheme = 'system' | 'light' | 'dark'

export type FontSize = 'small' | 'medium' | 'large'

export interface AppSettings {
  theme: AppTheme
  rewriteEnabled: boolean
  fontSize: FontSize
  fontFamily: string
  showHotSearchCard: boolean
}

export interface AppSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export const APP_SETTINGS_STORAGE_KEY = 'xb:app-settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  rewriteEnabled: true,
  fontSize: 'medium',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  showHotSearchCard: true,
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isFontSize(value: unknown): value is FontSize {
  return value === 'small' || value === 'medium' || value === 'large'
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
    fontSize: isFontSize(candidate.fontSize) ? candidate.fontSize : DEFAULT_APP_SETTINGS.fontSize,
    fontFamily:
      typeof candidate.fontFamily === 'string' && candidate.fontFamily.length > 0
        ? candidate.fontFamily
        : DEFAULT_APP_SETTINGS.fontFamily,
    showHotSearchCard:
      typeof candidate.showHotSearchCard === 'boolean'
        ? candidate.showHotSearchCard
        : DEFAULT_APP_SETTINGS.showHotSearchCard,
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
