export type AppLanguage = 'en' | 'zh'
export type AppAppearance = 'system' | 'light' | 'dark'

export interface AppSettings {
  language: AppLanguage
  appearance: AppAppearance
}

export const APP_SETTINGS_STORAGE_KEY = 'appSettings'

export const defaultAppSettings: AppSettings = {
  language: 'en',
  appearance: 'system',
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return value === 'zh' ? 'zh' : 'en'
}

export function normalizeAppAppearance(value: unknown): AppAppearance {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return 'system'
}

function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return defaultAppSettings
  }

  const input = value as Partial<AppSettings>

  return {
    language: normalizeAppLanguage(input.language),
    appearance: normalizeAppAppearance(input.appearance),
  }
}

export const appSettings = {
  async get(): Promise<AppSettings> {
    const result = await browser.storage.local.get(APP_SETTINGS_STORAGE_KEY)
    const stored = result[APP_SETTINGS_STORAGE_KEY]

    if (!stored || typeof stored !== 'object') {
      await this.set(defaultAppSettings)
      return defaultAppSettings
    }

    const normalized = normalizeAppSettings(stored)

    const storedInput = stored as Partial<AppSettings>

    if (
      normalized.language !== storedInput.language ||
      normalized.appearance !== storedInput.appearance
    ) {
      await this.set(normalized)
    }

    return normalized
  },

  async set(nextSettings: AppSettings): Promise<void> {
    await browser.storage.local.set({
      [APP_SETTINGS_STORAGE_KEY]: normalizeAppSettings(nextSettings),
    })
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const nextSettings = normalizeAppSettings({
      ...current,
      ...patch,
    })

    await this.set(nextSettings)

    return nextSettings
  },
}
