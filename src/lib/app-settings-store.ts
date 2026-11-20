import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  normalizeAppSettings,
  persistAppSettings,
  type AppSettings,
  type AppSettingsPatch,
  type AppSettingsStorageArea,
  type UserTheme,
} from '@/lib/app-settings'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'

export interface AppSettingsStoreState extends AppSettings {
  isHydrated: boolean
  hydrate: () => Promise<void>
  updateSettings: (patch: AppSettingsPatch) => Promise<void>
  addUserTheme: (theme: UserTheme) => Promise<void>
  deleteUserTheme: (id: string) => Promise<void>
  updateUserTheme: (
    id: string,
    updates: Partial<Pick<UserTheme, 'lightCss' | 'darkCss' | 'name'>>,
  ) => Promise<void>
}

export type AppSettingsStore = StoreApi<AppSettingsStoreState>

type AppSettingsStorageChangeEvent = Pick<
  typeof browser.storage.onChanged,
  'addListener' | 'removeListener'
>

export function createAppSettingsStore(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): AppSettingsStore {
  return createStore<AppSettingsStoreState>((set, get) => {
    let persistQueue: Promise<unknown> = Promise.resolve()

    async function updateAndPersist(patch: AppSettingsPatch) {
      const merge = (latest: AppSettings): AppSettings => ({
        appearance: { ...latest.appearance, ...patch.appearance },
        navigation: { ...latest.navigation, ...patch.navigation },
        feed: { ...latest.feed, ...patch.feed },
        imageGen: { ...latest.imageGen, ...patch.imageGen },
        home: { ...latest.home, ...patch.home },
        features: { ...latest.features, ...patch.features },
        media: { ...latest.media, ...patch.media },
        themes: { ...latest.themes, ...patch.themes },
      })
      const next = merge(get())
      set(next)
      const persistTask = persistQueue.then(async () => {
        // 读取最新快照后只合并本次 patch，避免旧标签页覆盖其他标签页刚保存的字段。
        const latest = await loadAppSettings(storageArea)
        return persistAppSettings(merge(latest), storageArea)
      })
      persistQueue = persistTask.catch(() => {})
      await persistTask
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      isHydrated: false,
      async hydrate() {
        const settings = await loadAppSettings(storageArea)

        if (
          settings.themes.selectedThemeType === 'preset' &&
          !settings.themes.customThemeLightCss.trim() &&
          !settings.themes.customThemeDarkCss.trim()
        ) {
          const preset = CUSTOM_THEME_PRESETS.find((p) => p.key === settings.themes.selectedThemeId)
          if (preset) {
            settings.themes.customThemeLightCss = preset.lightCss
            settings.themes.customThemeDarkCss = preset.darkCss
          }
        }

        set({ ...settings, isHydrated: true })
      },
      updateSettings: updateAndPersist,
      async addUserTheme(theme) {
        const current = get()
        await updateAndPersist({
          themes: {
            userThemes: current.themes.userThemes.some((item) => item.id === theme.id)
              ? current.themes.userThemes
              : [...current.themes.userThemes, theme],
          },
        })
      },
      async deleteUserTheme(id) {
        const current = get()
        await updateAndPersist({
          themes: { userThemes: current.themes.userThemes.filter((t) => t.id !== id) },
        })
      },
      async updateUserTheme(id, updates) {
        const current = get()
        await updateAndPersist({
          themes: {
            userThemes: current.themes.userThemes.map((t) =>
              t.id === id ? { ...t, ...updates } : t,
            ),
            ...(current.themes.selectedThemeType === 'custom' &&
            current.themes.selectedThemeId === id
              ? {
                  ...(updates.lightCss === undefined
                    ? {}
                    : { customThemeLightCss: updates.lightCss }),
                  ...(updates.darkCss === undefined ? {} : { customThemeDarkCss: updates.darkCss }),
                }
              : {}),
          },
        })
      },
    }
  })
}

export function bindAppSettingsStorageSync(
  store: AppSettingsStore,
  storageChanges: AppSettingsStorageChangeEvent = browser.storage.onChanged,
) {
  const onStorageChanged: Parameters<AppSettingsStorageChangeEvent['addListener']>[0] = (
    changes,
    areaName,
  ) => {
    if (areaName !== 'local' || !(APP_SETTINGS_STORAGE_KEY in changes)) return

    const nextSettings = normalizeAppSettings(changes[APP_SETTINGS_STORAGE_KEY]?.newValue)
    store.setState(nextSettings)
  }

  storageChanges.addListener(onStorageChanged)
  return () => storageChanges.removeListener(onStorageChanged)
}

let appSettingsStore: AppSettingsStore | null = null

export function getAppSettingsStore(storageArea?: AppSettingsStorageArea): AppSettingsStore {
  if (!appSettingsStore) {
    appSettingsStore = createAppSettingsStore(storageArea)
  }

  return appSettingsStore
}

export function resetAppSettingsStoreForTest() {
  appSettingsStore = null
}

export function useAppSettings<T>(selector: (state: AppSettingsStoreState) => T): T {
  return useStore(getAppSettingsStore(), selector)
}

export { useShallow }
