import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  type AppSettings,
  type AppSettingsStorageArea,
  type AppTheme,
  type CardStyle,
  type FontFamilyClass,
  type FontSize,
  type GenImageCardTheme,
} from '@/lib/app-settings'

export interface AppSettingsStoreState extends AppSettings {
  isHydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setRewriteEnabled: (enabled: boolean) => Promise<void>
  setFontSizeClass: (fontSizeClass: FontSize) => Promise<void>
  setFontFamilyClass: (fontFamilyClass: FontFamilyClass) => Promise<void>
  setShowHotSearchCard: (show: boolean) => Promise<void>
  setCollapseRepliesEnabled: (enabled: boolean) => Promise<void>
  setDarkModeImageDim: (enabled: boolean) => Promise<void>
  setImageGenEnabled: (enabled: boolean) => Promise<void>
  setImageGenShowDataArea: (show: boolean) => Promise<void>
  setImageGenShowFullImages: (show: boolean) => Promise<void>
  setImageGenShowWeiboLink: (show: boolean) => Promise<void>
  setImageGenTheme: (theme: GenImageCardTheme) => Promise<void>
  setImageGenCardStyle: (style: CardStyle) => Promise<void>
}

export type AppSettingsStore = StoreApi<AppSettingsStoreState>

function toPersistedSettings(state: AppSettingsStoreState): AppSettings {
  return {
    theme: state.theme,
    rewriteEnabled: state.rewriteEnabled,
    fontSizeClass: state.fontSizeClass,
    fontFamilyClass: state.fontFamilyClass,
    showHotSearchCard: state.showHotSearchCard,
    collapseRepliesEnabled: state.collapseRepliesEnabled,
    darkModeImageDim: state.darkModeImageDim,
    imageGenEnabled: state.imageGenEnabled,
    imageGenShowDataArea: state.imageGenShowDataArea,
    imageGenShowFullImages: state.imageGenShowFullImages,
    imageGenShowWeiboLink: state.imageGenShowWeiboLink,
    imageGenTheme: state.imageGenTheme,
    imageGenCardStyle: state.imageGenCardStyle,
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
      async setCollapseRepliesEnabled(collapseRepliesEnabled) {
        await updateAndPersist({ collapseRepliesEnabled })
      },
      async setDarkModeImageDim(darkModeImageDim) {
        await updateAndPersist({ darkModeImageDim })
      },
      async setImageGenEnabled(imageGenEnabled) {
        await updateAndPersist({ imageGenEnabled })
      },
      async setImageGenShowDataArea(imageGenShowDataArea) {
        await updateAndPersist({ imageGenShowDataArea })
      },
      async setImageGenShowFullImages(imageGenShowFullImages) {
        await updateAndPersist({ imageGenShowFullImages })
      },
      async setImageGenShowWeiboLink(imageGenShowWeiboLink) {
        await updateAndPersist({ imageGenShowWeiboLink })
      },
      async setImageGenTheme(imageGenTheme) {
        await updateAndPersist({ imageGenTheme })
      },
      async setImageGenCardStyle(imageGenCardStyle) {
        await updateAndPersist({ imageGenCardStyle })
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
