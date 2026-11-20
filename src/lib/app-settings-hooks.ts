import { useAppSettings, useShallow, type AppSettingsStoreState } from './app-settings-store'

export function useAppearanceSettings() {
  return useAppSettings((settings) => settings.appearance)
}

export function useNavigationSettings() {
  return useAppSettings((settings) => settings.navigation)
}

export function useFeedSettings() {
  return useAppSettings((settings) => settings.feed)
}

export function useImageGenSettings() {
  return useAppSettings((settings) => settings.imageGen)
}

export function useHomeSettings() {
  return useAppSettings((settings) => settings.home)
}

export function useFeatureSettings() {
  return useAppSettings((settings) => settings.features)
}

export function useMediaSettings() {
  return useAppSettings((settings) => settings.media)
}

export function useThemeSettings() {
  return useAppSettings((settings) => settings.themes)
}

export function useSettingsGroups<T>(selector: (settings: AppSettingsStoreState) => T) {
  return useAppSettings(useShallow(selector))
}
