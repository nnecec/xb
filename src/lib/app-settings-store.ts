import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  type AppSettings,
  type AppSettingsStorageArea,
  type AppTheme,
  type FontFamilyClass,
  type FontSize,
} from '@/lib/app-settings'

export interface AppSettingsStoreState extends AppSettings {
  isHydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setRewriteEnabled: (enabled: boolean) => Promise<void>
  setFontSizeClass: (fontSizeClass: FontSize) => Promise<void>
  setFontFamilyClass: (fontFamilyClass: FontFamilyClass) => Promise<void>
  setShowHotSearchCard: (show: boolean) => Promise<void>
}

export type AppSettingsStore = StoreApi<AppSettingsStoreState>

function toPersistedSettings(state: AppSettingsStoreState): AppSettings {
  return {
    theme: state.theme,
    rewriteEnabled: state.rewriteEnabled,
    fontSizeClass: state.fontSizeClass,
    fontFamilyClass: state.fontFamilyClass,
    showHotSearchCard: state.showHotSearchCard,
  }
}

export function createAppSettingsStore(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): AppSettingsStore {
  return createStore<AppSettingsStoreState>((set, get) => {
    async function updateAndPersist(patch: Partial<AppSettings>) {
      set(patch)
      await persistAppSettings(
        {
          ...toPersistedSettings(get()),
          ...patch,
        },
        storageArea,
      )
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      isHydrated: false,
      async hydrate() {
        const settings = await loadAppSettings(storageArea)
        set({
          ...settings,
          isHydrated: true,
        })
      },
      async setTheme(theme) {
        await updateAndPersist({ theme })
      },
      async setRewriteEnabled(rewriteEnabled) {
        await updateAndPersist({ rewriteEnabled })
      },
      async setFontSizeClass(fontSizeClass) {
        await updateAndPersist({ fontSizeClass })
      },
      async setFontFamilyClass(fontFamilyClass) {
        await updateAndPersist({ fontFamilyClass })
      },
      async setShowHotSearchCard(showHotSearchCard) {
        await updateAndPersist({ showHotSearchCard })
      },
    }
  })
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
