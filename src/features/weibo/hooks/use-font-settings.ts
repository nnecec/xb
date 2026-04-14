import { useAppSettings } from '@/lib/app-settings-store'
import type { FontSize } from '@/lib/app-settings'

const FONT_SIZE_CLASS: Record<FontSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

export function useFontSettings() {
  const fontSize = useAppSettings((s) => s.fontSize) as FontSize
  const fontFamily = useAppSettings((s) => s.fontFamily)

  return {
    fontSizeClass: FONT_SIZE_CLASS[fontSize],
    fontFamily,
  }
}
