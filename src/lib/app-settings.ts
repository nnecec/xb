import { FONT_FAMILY_CLASSES, RemoteFontFamily, SystemFontFamily } from './font-loader'

export type AppTheme = 'system' | 'light' | 'dark'

export type LightBgColorPreset = 'white' | 'paper' | 'sepia' | 'light-gray'

export type DarkBgColorPreset = 'near-black' | 'black' | 'dark-gray' | 'warm-dark'

export type BackgroundColorPreset = LightBgColorPreset | DarkBgColorPreset

export interface BgColorPresetDef {
  key: BackgroundColorPreset
  name: string
  background: string
  card: string
}

export const LIGHT_BG_PRESETS: BgColorPresetDef[] = [
  { key: 'white', name: '纯白', background: 'oklch(1 0 0)', card: 'oklch(1 0 0)' },
  {
    key: 'paper',
    name: '纸张',
    background: 'oklch(0.966 0.0093 99.98)',
    card: 'oklch(0.9818 0.0054 95.1)',
  },
  {
    key: 'sepia',
    name: '护眼黄',
    background: 'oklch(0.97 0.012 75)',
    card: 'oklch(0.98 0.009 75)',
  },
  { key: 'light-gray', name: '浅灰', background: 'oklch(0.965 0 0)', card: 'oklch(0.98 0 0)' },
]

export const DARK_BG_PRESETS: BgColorPresetDef[] = [
  {
    key: 'near-black',
    name: '深灰',
    background: 'oklch(0.1908 0.002 106.59)',
    card: 'oklch(0.205 0 0)',
  },
  { key: 'black', name: '纯黑', background: 'oklch(0 0 0)', card: 'oklch(0.1 0 0)' },
  { key: 'dark-gray', name: '暗灰', background: 'oklch(0.2 0 0)', card: 'oklch(0.25 0 0)' },
  {
    key: 'warm-dark',
    name: '暖黑',
    background: 'oklch(0.16 0.008 60)',
    card: 'oklch(0.21 0.006 60)',
  },
]

export type FontFamilyClass = SystemFontFamily | RemoteFontFamily

export type HotSearchType = 'hot' | 'mine' | 'entertainment' | 'life' | 'social'

export type FontSizeClass =
  | 'text-xs'
  | 'text-sm'
  | 'text-base'
  | 'text-lg'
  | 'text-xl'
  | 'text-2xl'
  | 'text-3xl'
  | 'text-4xl'

export type FontWeightClass =
  | 'font-thin'
  | 'font-extralight'
  | 'font-light'
  | 'font-normal'
  | 'font-medium'
  | 'font-semibold'
  | 'font-bold'
  | 'font-extrabold'
  | 'font-black'

export type LetterSpacingClass =
  | 'tracking-tighter'
  | 'tracking-tight'
  | 'tracking-normal'
  | 'tracking-wide'
  | 'tracking-wider'
  | 'tracking-widest'

export type LineHeightClass =
  | 'leading-none'
  | 'leading-tight'
  | 'leading-snug'
  | 'leading-normal'
  | 'leading-relaxed'
  | 'leading-loose'

export type ContentWidth = 'standard' | 'wide' | 'wider'
export type StatusDetailPopupPosition = 'left' | 'center' | 'right'

export interface AppSettings {
  contentWidth: ContentWidth
  theme: AppTheme
  rewriteEnabled: boolean
  fontSizeClass: FontSizeClass
  fontWeightClass: FontWeightClass
  letterSpacingClass: LetterSpacingClass
  lineHeightClass: LineHeightClass
  fontFamilyClass: FontFamilyClass
  showHotSearchCard: boolean
  collapseRepliesEnabled: boolean
  renderReplyChainEnabled: boolean
  darkModeImageDim: boolean
  lightModeBgColor: LightBgColorPreset
  darkModeBgColor: DarkBgColorPreset
  imageGenEnabled: boolean
  imageGenShowDataArea: boolean
  imageGenShowFullImages: boolean
  imageGenShowWeiboLink: boolean
  imageGenTheme: GenImageCardTheme
  imageGenCardStyle: CardStyle
  hotSearchType: HotSearchType
  statusDetailPopupEnabled: boolean
  statusDetailPopupPosition: StatusDetailPopupPosition
  statusDetailPopupWidth: number
  backgroundEnabled: boolean
  backgroundColor: string
  backgroundImageUrl: string
  glassOpacity: number
  glassBlur: number
  xLayoutEnabled: boolean
  waterfallColumnCount: number
  browsingHistoryEnabled: boolean
  followGroupsEnabled: boolean
  xbTopicPage: boolean
}

export type GenImageCardTheme = 'light' | 'dark'

export type CardStyle =
  | 'default'
  | 'minimal'
  | 'glass'
  | 'bold'
  | 'contrast'
  | 'vogue'
  | 'soft'
  | 'sticker'
  | 'comic'

export interface AppSettingsStorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

export const APP_SETTINGS_STORAGE_KEY = 'xb:app-settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  contentWidth: 'standard' as ContentWidth,
  theme: 'system',
  rewriteEnabled: true,
  fontSizeClass: 'text-base',
  fontWeightClass: 'font-normal',
  letterSpacingClass: 'tracking-normal',
  lineHeightClass: 'leading-relaxed',
  fontFamilyClass: 'font-sans',
  showHotSearchCard: true,
  collapseRepliesEnabled: false,
  renderReplyChainEnabled: true,
  darkModeImageDim: false,
  lightModeBgColor: 'white' as LightBgColorPreset,
  darkModeBgColor: 'near-black' as DarkBgColorPreset,
  imageGenEnabled: true,
  imageGenShowDataArea: true,
  imageGenShowFullImages: false,
  imageGenShowWeiboLink: false,
  imageGenTheme: 'light' as GenImageCardTheme,
  imageGenCardStyle: 'default' as CardStyle,
  hotSearchType: 'hot' as HotSearchType,
  statusDetailPopupEnabled: true,
  statusDetailPopupPosition: 'right',
  statusDetailPopupWidth: 50,
  backgroundEnabled: true,
  backgroundColor: '#1e40af',
  backgroundImageUrl: 'https://bing.img.run/1920x1080.php',
  glassOpacity: 80,
  glassBlur: 12,
  xLayoutEnabled: false,
  waterfallColumnCount: 1,
  browsingHistoryEnabled: true,
  followGroupsEnabled: false,
  xbTopicPage: true,
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isFontFamilyClass(value: unknown): value is FontFamilyClass {
  return FONT_FAMILY_CLASSES.includes(value as FontFamilyClass)
}

function isHotSearchType(value: unknown): value is HotSearchType {
  return (
    value === 'hot' ||
    value === 'mine' ||
    value === 'entertainment' ||
    value === 'life' ||
    value === 'social'
  )
}

function isLightBgColorPreset(value: unknown): value is LightBgColorPreset {
  return value === 'white' || value === 'paper' || value === 'sepia' || value === 'light-gray'
}

function isDarkBgColorPreset(value: unknown): value is DarkBgColorPreset {
  return (
    value === 'near-black' || value === 'black' || value === 'dark-gray' || value === 'warm-dark'
  )
}

function isFontSizeClass(value: unknown): value is FontSizeClass {
  return (
    value === 'text-xs' ||
    value === 'text-sm' ||
    value === 'text-base' ||
    value === 'text-lg' ||
    value === 'text-xl' ||
    value === 'text-2xl' ||
    value === 'text-3xl' ||
    value === 'text-4xl'
  )
}

function isFontWeightClass(value: unknown): value is FontWeightClass {
  return (
    value === 'font-thin' ||
    value === 'font-extralight' ||
    value === 'font-light' ||
    value === 'font-normal' ||
    value === 'font-medium' ||
    value === 'font-semibold' ||
    value === 'font-bold' ||
    value === 'font-extrabold' ||
    value === 'font-black'
  )
}

function isLetterSpacingClass(value: unknown): value is LetterSpacingClass {
  return (
    value === 'tracking-tighter' ||
    value === 'tracking-tight' ||
    value === 'tracking-normal' ||
    value === 'tracking-wide' ||
    value === 'tracking-wider' ||
    value === 'tracking-widest'
  )
}

function isLineHeightClass(value: unknown): value is LineHeightClass {
  return (
    value === 'leading-none' ||
    value === 'leading-tight' ||
    value === 'leading-snug' ||
    value === 'leading-normal' ||
    value === 'leading-relaxed' ||
    value === 'leading-loose'
  )
}

function isContentWidth(value: unknown): value is ContentWidth {
  return value === 'standard' || value === 'wide' || value === 'wider'
}

function isStatusDetailPopupPosition(value: unknown): value is StatusDetailPopupPosition {
  return value === 'left' || value === 'center' || value === 'right'
}

function isStatusDetailPopupWidth(value: unknown): value is number {
  return typeof value === 'number' && value >= 50 && value <= 80
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  const candidate = value as Partial<AppSettings>

  return {
    contentWidth: isContentWidth(candidate.contentWidth)
      ? candidate.contentWidth
      : DEFAULT_APP_SETTINGS.contentWidth,
    theme: isAppTheme(candidate.theme) ? candidate.theme : DEFAULT_APP_SETTINGS.theme,
    rewriteEnabled:
      typeof candidate.rewriteEnabled === 'boolean'
        ? candidate.rewriteEnabled
        : DEFAULT_APP_SETTINGS.rewriteEnabled,
    fontSizeClass: isFontSizeClass(candidate.fontSizeClass)
      ? candidate.fontSizeClass
      : DEFAULT_APP_SETTINGS.fontSizeClass,
    fontWeightClass: isFontWeightClass(candidate.fontWeightClass)
      ? candidate.fontWeightClass
      : DEFAULT_APP_SETTINGS.fontWeightClass,
    letterSpacingClass: isLetterSpacingClass(candidate.letterSpacingClass)
      ? candidate.letterSpacingClass
      : DEFAULT_APP_SETTINGS.letterSpacingClass,
    lineHeightClass: isLineHeightClass(candidate.lineHeightClass)
      ? candidate.lineHeightClass
      : DEFAULT_APP_SETTINGS.lineHeightClass,
    fontFamilyClass: isFontFamilyClass(candidate.fontFamilyClass)
      ? candidate.fontFamilyClass
      : DEFAULT_APP_SETTINGS.fontFamilyClass,
    showHotSearchCard:
      typeof candidate.showHotSearchCard === 'boolean'
        ? candidate.showHotSearchCard
        : DEFAULT_APP_SETTINGS.showHotSearchCard,
    collapseRepliesEnabled:
      typeof candidate.collapseRepliesEnabled === 'boolean'
        ? candidate.collapseRepliesEnabled
        : DEFAULT_APP_SETTINGS.collapseRepliesEnabled,
    renderReplyChainEnabled:
      typeof candidate.renderReplyChainEnabled === 'boolean'
        ? candidate.renderReplyChainEnabled
        : DEFAULT_APP_SETTINGS.renderReplyChainEnabled,
    darkModeImageDim:
      typeof candidate.darkModeImageDim === 'boolean'
        ? candidate.darkModeImageDim
        : DEFAULT_APP_SETTINGS.darkModeImageDim,
    lightModeBgColor: isLightBgColorPreset(candidate.lightModeBgColor)
      ? candidate.lightModeBgColor
      : DEFAULT_APP_SETTINGS.lightModeBgColor,
    darkModeBgColor: isDarkBgColorPreset(candidate.darkModeBgColor)
      ? candidate.darkModeBgColor
      : DEFAULT_APP_SETTINGS.darkModeBgColor,
    imageGenEnabled:
      typeof candidate.imageGenEnabled === 'boolean'
        ? candidate.imageGenEnabled
        : DEFAULT_APP_SETTINGS.imageGenEnabled,
    imageGenShowDataArea:
      typeof candidate.imageGenShowDataArea === 'boolean'
        ? candidate.imageGenShowDataArea
        : DEFAULT_APP_SETTINGS.imageGenShowDataArea,
    imageGenShowFullImages:
      typeof candidate.imageGenShowFullImages === 'boolean'
        ? candidate.imageGenShowFullImages
        : DEFAULT_APP_SETTINGS.imageGenShowFullImages,
    imageGenShowWeiboLink:
      typeof candidate.imageGenShowWeiboLink === 'boolean'
        ? candidate.imageGenShowWeiboLink
        : DEFAULT_APP_SETTINGS.imageGenShowWeiboLink,
    imageGenTheme:
      candidate.imageGenTheme === 'light' || candidate.imageGenTheme === 'dark'
        ? candidate.imageGenTheme
        : DEFAULT_APP_SETTINGS.imageGenTheme,
    imageGenCardStyle:
      typeof candidate.imageGenCardStyle === 'string'
        ? candidate.imageGenCardStyle
        : DEFAULT_APP_SETTINGS.imageGenCardStyle,
    hotSearchType: isHotSearchType(candidate.hotSearchType)
      ? candidate.hotSearchType
      : DEFAULT_APP_SETTINGS.hotSearchType,
    statusDetailPopupEnabled:
      typeof candidate.statusDetailPopupEnabled === 'boolean'
        ? candidate.statusDetailPopupEnabled
        : DEFAULT_APP_SETTINGS.statusDetailPopupEnabled,
    statusDetailPopupPosition: isStatusDetailPopupPosition(candidate.statusDetailPopupPosition)
      ? candidate.statusDetailPopupPosition
      : DEFAULT_APP_SETTINGS.statusDetailPopupPosition,
    statusDetailPopupWidth: isStatusDetailPopupWidth(candidate.statusDetailPopupWidth)
      ? candidate.statusDetailPopupWidth
      : DEFAULT_APP_SETTINGS.statusDetailPopupWidth,
    backgroundEnabled:
      typeof candidate.backgroundEnabled === 'boolean'
        ? candidate.backgroundEnabled
        : DEFAULT_APP_SETTINGS.backgroundEnabled,
    backgroundColor:
      typeof candidate.backgroundColor === 'string'
        ? candidate.backgroundColor
        : DEFAULT_APP_SETTINGS.backgroundColor,
    backgroundImageUrl:
      typeof candidate.backgroundImageUrl === 'string'
        ? candidate.backgroundImageUrl
        : DEFAULT_APP_SETTINGS.backgroundImageUrl,
    glassOpacity:
      typeof candidate.glassOpacity === 'number' &&
      candidate.glassOpacity >= 0 &&
      candidate.glassOpacity <= 100
        ? candidate.glassOpacity
        : DEFAULT_APP_SETTINGS.glassOpacity,
    glassBlur:
      typeof candidate.glassBlur === 'number' &&
      candidate.glassBlur >= 0 &&
      candidate.glassBlur <= 20
        ? candidate.glassBlur
        : DEFAULT_APP_SETTINGS.glassBlur,
    xLayoutEnabled:
      typeof candidate.xLayoutEnabled === 'boolean'
        ? candidate.xLayoutEnabled
        : DEFAULT_APP_SETTINGS.xLayoutEnabled,
    waterfallColumnCount:
      typeof candidate.waterfallColumnCount === 'number' &&
      candidate.waterfallColumnCount >= 1 &&
      candidate.waterfallColumnCount <= 5
        ? candidate.waterfallColumnCount
        : DEFAULT_APP_SETTINGS.waterfallColumnCount,
    browsingHistoryEnabled:
      typeof candidate.browsingHistoryEnabled === 'boolean'
        ? candidate.browsingHistoryEnabled
        : DEFAULT_APP_SETTINGS.browsingHistoryEnabled,
    followGroupsEnabled:
      typeof candidate.followGroupsEnabled === 'boolean'
        ? candidate.followGroupsEnabled
        : DEFAULT_APP_SETTINGS.followGroupsEnabled,
    xbTopicPage:
      typeof candidate.xbTopicPage === 'boolean'
        ? candidate.xbTopicPage
        : DEFAULT_APP_SETTINGS.xbTopicPage,
  }
}

export function resolveIsDarkMode(theme: AppTheme, prefersDark: boolean): boolean {
  if (theme === 'dark') {
    return true
  }

  if (theme === 'light') {
    return false
  }

  return prefersDark
}

export async function loadAppSettings(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const stored = await storageArea.get(APP_SETTINGS_STORAGE_KEY)
  return normalizeAppSettings(stored[APP_SETTINGS_STORAGE_KEY])
}

export async function persistAppSettings(
  nextValue: AppSettings,
  storageArea: AppSettingsStorageArea = browser.storage.local,
): Promise<AppSettings> {
  const normalized = normalizeAppSettings(nextValue)

  await storageArea.set({
    [APP_SETTINGS_STORAGE_KEY]: normalized,
  })

  return normalized
}
