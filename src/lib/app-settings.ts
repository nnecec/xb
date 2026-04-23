export type AppTheme = 'system' | 'light' | 'dark'

export type FontSize = 'text-xs' | 'text-sm' | 'text-base' | 'text-lg' | 'text-xl'
type LegacyFontSize = 'small' | 'medium' | 'large'

export type FontFamilyClass = 'font-sans' | 'font-serif'

export interface AppSettings {
  theme: AppTheme
  rewriteEnabled: boolean
  fontSizeClass: FontSize
  fontFamilyClass: FontFamilyClass
  showHotSearchCard: boolean
  collapseRepliesEnabled: boolean
  darkModeImageDim: boolean
}

export interface AppSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export const APP_SETTINGS_STORAGE_KEY = 'xb:app-settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  rewriteEnabled: true,
  fontSizeClass: 'text-base',
  fontFamilyClass: 'font-sans',
  showHotSearchCard: true,
  collapseRepliesEnabled: false,
  darkModeImageDim: false,
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isFontSize(value: unknown): value is FontSize {
  return (
    value === 'text-xs' ||
    value === 'text-sm' ||
    value === 'text-base' ||
    value === 'text-lg' ||
    value === 'text-xl'
  )
}

function toFontSize(value: unknown): FontSize | null {
  if (isFontSize(value)) {
    return value
  }

  if (value === 'small') {
    return 'text-sm'
  }

  if (value === 'medium') {
    return 'text-base'
  }

  if (value === 'large') {
    return 'text-lg'
  }

  return null
}

function isFontFamilyClass(value: unknown): value is FontFamilyClass {
  return value === 'font-sans' || value === 'font-serif'
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  const candidate = value as Partial<AppSettings> & { fontSize?: LegacyFontSize | FontSize }
  const normalizedFontSize = toFontSize(candidate.fontSizeClass ?? candidate.fontSize)

  return {
    theme: isAppTheme(candidate.theme) ? candidate.theme : DEFAULT_APP_SETTINGS.theme,
    rewriteEnabled:
      typeof candidate.rewriteEnabled === 'boolean'
        ? candidate.rewriteEnabled
        : DEFAULT_APP_SETTINGS.rewriteEnabled,
    fontSizeClass: normalizedFontSize ?? DEFAULT_APP_SETTINGS.fontSizeClass,
    fontFamilyClass: isFontFamilyClass(candidate.fontFamilyClass)
      ? candidate.fontFamilyClass
      : DEFAULT_APP_SETTINGS.fontFamilyClass,
    showHotSearchCard:
      typeof candidate.showHotSearchCard === 'boolean'
        ? candidate.showHotSearchCard
        : DEFAULT_APP_SETTINGS.showHotSearchCard,
    collapseRepliesEnabled:
      typeof candidate.collapseRepliesEnabled === 'boolean'
        ? candidate.collapseRepliesEnabled
        : DEFAULT_APP_SETTINGS.collapseRepliesEnabled,
    darkModeImageDim:
      typeof candidate.darkModeImageDim === 'boolean'
        ? candidate.darkModeImageDim
        : DEFAULT_APP_SETTINGS.darkModeImageDim,
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
