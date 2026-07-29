import { DEFAULT_CUSTOM_CONTENT_WIDTH, type ContentWidth } from '@/lib/app-settings'

const CONTENT_WIDTH_DELTA_PX: Record<ContentWidth, number> = {
  narrower: -300,
  narrow: -150,
  standard: 0,
  wide: 150,
  wider: 300,
  custom: 0,
}

export function getContentWidthAdjustedMaxWidth(
  contentWidth: ContentWidth,
  baseWidth: number,
  customContentWidth = DEFAULT_CUSTOM_CONTENT_WIDTH,
) {
  const delta =
    contentWidth === 'custom'
      ? customContentWidth - DEFAULT_CUSTOM_CONTENT_WIDTH
      : CONTENT_WIDTH_DELTA_PX[contentWidth]
  return `${Math.max(320, baseWidth + delta)}px`
}
