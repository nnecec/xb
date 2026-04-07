export type RewriteTheme = 'system' | 'light' | 'dark'

export interface RewriteSettings {
  enabled: boolean
  theme: RewriteTheme
}

export interface RewriteSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export interface RewriteSettingsStore {
  getSnapshot: () => RewriteSettings
  subscribe: (listener: () => void) => () => void
  update: (patch: Partial<RewriteSettings>) => Promise<RewriteSettings>
  dispose: () => void
}

export const REWRITE_SETTINGS_STORAGE_KEY = 'loveforxb:rewrite-settings'

export const DEFAULT_REWRITE_SETTINGS: RewriteSettings = {
  enabled: true,
  theme: 'system',
}

function isRewriteTheme(value: unknown): value is RewriteTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function normalizeRewriteSettings(value: unknown): RewriteSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_REWRITE_SETTINGS }
  }

  const candidate = value as Partial<RewriteSettings>

  return {
    enabled: typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : DEFAULT_REWRITE_SETTINGS.enabled,
    theme: isRewriteTheme(candidate.theme)
      ? candidate.theme
      : DEFAULT_REWRITE_SETTINGS.theme,
  }
}

export function resolveIsDarkMode(
  theme: RewriteTheme,
  prefersDark: boolean,
): boolean {
  if (theme === 'dark') {
    return true
  }

  if (theme === 'light') {
    return false
  }

  return prefersDark
}

export async function loadRewriteSettings(
  storageArea: RewriteSettingsStorageArea = browser.storage.local,
): Promise<RewriteSettings> {
  const stored = await storageArea.get(REWRITE_SETTINGS_STORAGE_KEY)
  return normalizeRewriteSettings(stored[REWRITE_SETTINGS_STORAGE_KEY])
}

export async function persistRewriteSettings(
  nextValue: RewriteSettings,
  storageArea: RewriteSettingsStorageArea = browser.storage.local,
): Promise<RewriteSettings> {
  const normalized = normalizeRewriteSettings(nextValue)

  await storageArea.set({
    [REWRITE_SETTINGS_STORAGE_KEY]: normalized,
  })

  return normalized
}

export function createRewriteSettingsStore(
  initialSettings: RewriteSettings,
  storageArea: RewriteSettingsStorageArea = browser.storage.local,
): RewriteSettingsStore {
  let snapshot = normalizeRewriteSettings(initialSettings)
  const listeners = new Set<() => void>()

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    async update(patch) {
      snapshot = normalizeRewriteSettings({
        ...snapshot,
        ...patch,
      })

      listeners.forEach((listener) => listener())
      await persistRewriteSettings(snapshot, storageArea)
      return snapshot
    },
    dispose() {
      listeners.clear()
    },
  }
}
