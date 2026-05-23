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
  type DarkBgColorPreset,
  type FontFamilyClass,
  type FontSizeClass,
  type FontWeightClass,
  type LetterSpacingClass,
  type LightBgColorPreset,
  type LineHeightClass,
  type GenImageCardTheme,
  type ContentWidth,
  type HotSearchType,
  type StatusDetailPopupPosition,
} from '@/lib/app-settings'

export interface AppSettingsStoreState extends AppSettings {
  isHydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setRewriteEnabled: (enabled: boolean) => Promise<void>
  setFontSizeClass: (fontSizeClass: FontSizeClass) => Promise<void>
  setFontWeightClass: (fontWeightClass: FontWeightClass) => Promise<void>
  setLetterSpacingClass: (letterSpacingClass: LetterSpacingClass) => Promise<void>
  setLineHeightClass: (lineHeightClass: LineHeightClass) => Promise<void>
  setFontFamilyClass: (fontFamilyClass: FontFamilyClass) => Promise<void>
  setShowHotSearchCard: (show: boolean) => Promise<void>
  setCollapseRepliesEnabled: (enabled: boolean) => Promise<void>
  setRenderReplyChainEnabled: (enabled: boolean) => Promise<void>
  setDarkModeImageDim: (enabled: boolean) => Promise<void>
  setLightModeBgColor: (color: LightBgColorPreset) => Promise<void>
  setDarkModeBgColor: (color: DarkBgColorPreset) => Promise<void>
  setImageGenEnabled: (enabled: boolean) => Promise<void>
  setImageGenShowDataArea: (show: boolean) => Promise<void>
  setImageGenShowFullImages: (show: boolean) => Promise<void>
  setImageGenShowWeiboLink: (show: boolean) => Promise<void>
  setImageGenTheme: (theme: GenImageCardTheme) => Promise<void>
  setImageGenCardStyle: (style: CardStyle) => Promise<void>
  setHotSearchType: (type: HotSearchType) => Promise<void>
  setStatusDetailPopupEnabled: (enabled: boolean) => Promise<void>
  setStatusDetailPopupPosition: (position: StatusDetailPopupPosition) => Promise<void>
  setStatusDetailPopupWidth: (width: number) => Promise<void>
  setBackgroundEnabled: (enabled: boolean) => Promise<void>
  setBackgroundColor: (color: string) => Promise<void>
  setGlassOpacity: (opacity: number) => Promise<void>
  setGlassBlur: (blur: number) => Promise<void>
  setBackgroundImageUrl: (url: string) => Promise<void>
  setXLayoutEnabled: (enabled: boolean) => Promise<void>
  setWaterfallColumnCount: (count: number) => Promise<void>
  setBrowsingHistoryEnabled: (enabled: boolean) => Promise<void>
  setFollowGroupsEnabled: (enabled: boolean) => Promise<void>
  setNativeTopicPage: (enabled: boolean) => Promise<void>
  setContentWidth: (width: ContentWidth) => Promise<void>
}

export type AppSettingsStore = StoreApi<AppSettingsStoreState>

function toPersistedSettings(state: AppSettingsStoreState): AppSettings {
  return {
    contentWidth: state.contentWidth,
    theme: state.theme,
    rewriteEnabled: state.rewriteEnabled,
    fontSizeClass: state.fontSizeClass,
    fontWeightClass: state.fontWeightClass,
    letterSpacingClass: state.letterSpacingClass,
    lineHeightClass: state.lineHeightClass,
    fontFamilyClass: state.fontFamilyClass,
    showHotSearchCard: state.showHotSearchCard,
    collapseRepliesEnabled: state.collapseRepliesEnabled,
    renderReplyChainEnabled: state.renderReplyChainEnabled,
    darkModeImageDim: state.darkModeImageDim,
    lightModeBgColor: state.lightModeBgColor,
    darkModeBgColor: state.darkModeBgColor,
    imageGenEnabled: state.imageGenEnabled,
    imageGenShowDataArea: state.imageGenShowDataArea,
    imageGenShowFullImages: state.imageGenShowFullImages,
    imageGenShowWeiboLink: state.imageGenShowWeiboLink,
    imageGenTheme: state.imageGenTheme,
    imageGenCardStyle: state.imageGenCardStyle,
    hotSearchType: state.hotSearchType,
    statusDetailPopupEnabled: state.statusDetailPopupEnabled,
    statusDetailPopupPosition: state.statusDetailPopupPosition,
    statusDetailPopupWidth: state.statusDetailPopupWidth,
    backgroundEnabled: state.backgroundEnabled,
    backgroundColor: state.backgroundColor,
    backgroundImageUrl: state.backgroundImageUrl,
    glassOpacity: state.glassOpacity,
    glassBlur: state.glassBlur,
    xLayoutEnabled: state.xLayoutEnabled,
    waterfallColumnCount: state.waterfallColumnCount,
    browsingHistoryEnabled: state.browsingHistoryEnabled,
    followGroupsEnabled: state.followGroupsEnabled,
    xbTopicPage: state.xbTopicPage,
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
      async setFontWeightClass(fontWeightClass) {
        await updateAndPersist({ fontWeightClass })
      },
      async setLetterSpacingClass(letterSpacingClass) {
        await updateAndPersist({ letterSpacingClass })
      },
      async setLineHeightClass(lineHeightClass) {
        await updateAndPersist({ lineHeightClass })
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
      async setRenderReplyChainEnabled(renderReplyChainEnabled) {
        await updateAndPersist({ renderReplyChainEnabled })
      },
      async setDarkModeImageDim(darkModeImageDim) {
        await updateAndPersist({ darkModeImageDim })
      },
      async setLightModeBgColor(lightModeBgColor) {
        await updateAndPersist({ lightModeBgColor })
      },
      async setDarkModeBgColor(darkModeBgColor) {
        await updateAndPersist({ darkModeBgColor })
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
      async setHotSearchType(hotSearchType) {
        await updateAndPersist({ hotSearchType })
      },
      async setStatusDetailPopupEnabled(statusDetailPopupEnabled) {
        await updateAndPersist({ statusDetailPopupEnabled })
      },
      async setStatusDetailPopupPosition(statusDetailPopupPosition) {
        await updateAndPersist({ statusDetailPopupPosition })
      },
      async setStatusDetailPopupWidth(statusDetailPopupWidth) {
        await updateAndPersist({ statusDetailPopupWidth })
      },
      async setBackgroundEnabled(backgroundEnabled) {
        await updateAndPersist({ backgroundEnabled })
      },
      async setBackgroundColor(backgroundColor) {
        await updateAndPersist({ backgroundColor })
      },
      async setGlassOpacity(glassOpacity) {
        await updateAndPersist({ glassOpacity })
      },
      async setGlassBlur(glassBlur) {
        await updateAndPersist({ glassBlur })
      },
      async setBackgroundImageUrl(backgroundImageUrl) {
        await updateAndPersist({ backgroundImageUrl })
      },
      async setXLayoutEnabled(xLayoutEnabled) {
        await updateAndPersist({ xLayoutEnabled })
      },
      async setWaterfallColumnCount(waterfallColumnCount) {
        await updateAndPersist({ waterfallColumnCount })
      },
      async setBrowsingHistoryEnabled(browsingHistoryEnabled) {
        await updateAndPersist({ browsingHistoryEnabled })
      },
      async setFollowGroupsEnabled(followGroupsEnabled) {
        await updateAndPersist({ followGroupsEnabled })
      },
      async setNativeTopicPage(xbTopicPage) {
        await updateAndPersist({ xbTopicPage })
      },
      async setContentWidth(contentWidth) {
        await updateAndPersist({ contentWidth })
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
