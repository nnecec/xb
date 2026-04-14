import type { FontFamilyClass, FontSize } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'

export function useFontSettings() {
  const fontSizeClass = useAppSettings((s) => s.fontSizeClass) as FontSize
  const fontFamilyClass = useAppSettings((s) => s.fontFamilyClass) as FontFamilyClass

  return {
    fontSizeClass,
    fontFamilyClass,
  }
}
