import { FONT_FAMILY_CLASSES, type RemoteFontFamily, type SystemFontFamily } from './font-loader'

export type AppTheme = 'system' | 'light' | 'dark'

type LightBgColorPreset = 'white' | 'paper' | 'sepia' | 'light-gray'

type DarkBgColorPreset = 'near-black' | 'black' | 'dark-gray' | 'warm-dark'

type BackgroundColorPreset = LightBgColorPreset | DarkBgColorPreset

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

/** 字体应用范围：正文仅 Feed/评论；应用额外共享字族到 UI chrome */
export type FontApplyScope = 'content' | 'app'

export type HotSearchType = 'hot' | 'mine' | 'entertainment' | 'life' | 'social'

/** 正文阅读尺度：最小 14px，最大 24px */
export type FontSizeClass = 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl'

/** 正文字重：本地与远程字体均可调节（远程多为合成字重） */
export type FontWeightClass = 'font-normal' | 'font-medium' | 'font-semibold' | 'font-bold'

/** 中文正文不宜极端字距 */
export type LetterSpacingClass = 'tracking-tight' | 'tracking-normal' | 'tracking-wide'

/** 正文行高：排除 leading-none / tight */
export type LineHeightClass =
  | 'leading-snug'
  | 'leading-normal'
  | 'leading-relaxed'
  | 'leading-loose'

export type ContentWidth = 'narrower' | 'narrow' | 'standard' | 'wide' | 'wider' | 'custom'

export const CUSTOM_CONTENT_WIDTH_MIN = 800
export const CUSTOM_CONTENT_WIDTH_MAX = 2000
export const CUSTOM_CONTENT_WIDTH_STEP = 20
export const DEFAULT_CUSTOM_CONTENT_WIDTH = 1200

export type HomeTab = 'for-you' | 'following' | 'special-follow' | 'friend-circle'

export type CustomThemePreset =
  | 'default'
  | 'vercel'
  | 'twitter'
  | 'supabase'
  | 'modern'
  | 'claude'
  | 'amethyst-haze'
  | 'bubblegum'
  | 'caffeine'
  | 'candyland'
  | 'claymorphism'
  | 'nature'

export interface UserTheme {
  id: string
  name: string
  lightCss: string
  darkCss: string
}

export type SelectedThemeType = 'preset' | 'custom'

export type FeedInteractionMode = 'x' | 'weibo'

const FEED_PRIMARY_ACTION_IDS = ['comment', 'repost', 'like'] as const

export type FeedPrimaryActionId = (typeof FEED_PRIMARY_ACTION_IDS)[number]

export const FEED_TOOLBAR_BUTTON_IDS = [
  'gen-image',
  'download-media',
  'favorite',
  'copy-link',
  'copy-text',
] as const

export type FeedToolbarButtonId = (typeof FEED_TOOLBAR_BUTTON_IDS)[number]

export const BROWSING_HISTORY_LIMIT_OPTIONS = [200, 300, 500] as const

export type BrowsingHistoryLimit = (typeof BROWSING_HISTORY_LIMIT_OPTIONS)[number]

const PLAYBACK_RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

type PlaybackRate = (typeof PLAYBACK_RATE_OPTIONS)[number]

export type MotionPreference = 'system' | 'full' | 'reduced'

export type ContentDensity = 'relaxed' | 'standard' | 'compact'

export type ContentDisplay = 'expanded' | 'collapsed'

export type WeiboCardMultiMediaLayout = 'grid' | 'horizontal'

export const WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS = [4, 6, 9, 12, 16] as const

export type WeiboCardMultiMediaGridLimit =
  (typeof WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS)[number]

export const WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MIN = 400
export const WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MAX = 900
export const WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_STEP = 50
export const DEFAULT_WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH = 650

export const WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MIN = 200
export const WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MAX = 600
export const WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_STEP = 20
export const DEFAULT_WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT = 360

export const WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN = 160
export const WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX = 1200
export const WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP = 10
export const DEFAULT_WEIBO_CARD_SINGLE_IMAGE_MAX_WIDTH = 450
export const DEFAULT_WEIBO_CARD_SINGLE_VIDEO_MAX_WIDTH = 650

export interface AppSettings {
  contentWidth: ContentWidth
  customContentWidth: number
  theme: AppTheme
  rewriteEnabled: boolean
  fontSizeClass: FontSizeClass
  fontWeightClass: FontWeightClass
  letterSpacingClass: LetterSpacingClass
  lineHeightClass: LineHeightClass
  fontFamilyClass: FontFamilyClass
  fontApplyScope: FontApplyScope
  showExplore: boolean
  showFavorites: boolean
  showHistory: boolean
  showNotifications: boolean
  showDMs: boolean
  showProfile: boolean
  showCompose: boolean
  showRightRail: boolean
  showHotSearchCard: boolean
  xbEntryCollapsed: boolean
  showFollowedSuperTopicsCard: boolean
  sidebarCollapsed: boolean
  immersiveMode: boolean
  motionPreference: MotionPreference
  collapseRepliesEnabled: boolean
  renderReplyChainEnabled: boolean
  darkModeImageDim: boolean
  autoLoadLongText: boolean
  feedDensity: ContentDensity
  weiboCardShowAvatar: boolean
  weiboCardShowTimestamp: boolean
  weiboCardShowPublishInfo: boolean
  weiboCardShowTitleBadge: boolean
  weiboCardShowInteractionCounts: boolean
  weiboCardMediaDisplay: ContentDisplay
  weiboCardSingleImageMaxWidth: number
  weiboCardSingleVideoMaxWidth: number
  weiboCardMultiMediaLayout: WeiboCardMultiMediaLayout
  weiboCardMultiMediaGridLimit: WeiboCardMultiMediaGridLimit
  weiboCardMultiMediaGridMaxWidth: number
  weiboCardMultiMediaStripHeight: number
  commentDensity: ContentDensity
  commentCardShowAvatar: boolean
  commentCardShowTimestamp: boolean
  commentCardShowPublishInfo: boolean
  commentCardShowAuthorBadge: boolean
  commentCardShowLikeCount: boolean
  commentCardShowThreadLine: boolean
  commentCardImageDisplay: ContentDisplay
  commentCardCollapseRepliesByDefault: boolean
  lightModeBgColor: LightBgColorPreset
  darkModeBgColor: DarkBgColorPreset
  imageGenEnabled: boolean
  imageGenShowDataArea: boolean
  imageGenShowFullImages: boolean
  imageGenShowWeiboLink: boolean
  imageGenTheme: GenImageCardTheme
  imageGenCardStyle: CardStyle
  hotSearchType: HotSearchType
  feedInteractionMode: FeedInteractionMode
  feedPrimaryActionOrder: FeedPrimaryActionId[]
  feedToolbarButtonIds: FeedToolbarButtonId[]
  browsingHistoryLimit: BrowsingHistoryLimit
  xbTopicPage: boolean
  ratingEnabled: boolean
  rememberPlaybackRate: boolean
  playbackRate: number
  forceRedirectToFollowing?: boolean
  firstLoadRedirect: HomeTab
  homeTab: HomeTab
  homeGroupId: string | null
  customThemeLightCss: string
  customThemeDarkCss: string
  selectedThemeType: SelectedThemeType
  selectedThemeId: string
  userThemes: UserTheme[]
  photoLoopEnabled: boolean
}

type GenImageCardTheme = 'light' | 'dark'

type CardStyle =
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
  customContentWidth: DEFAULT_CUSTOM_CONTENT_WIDTH,
  theme: 'system',
  rewriteEnabled: true,
  fontSizeClass: 'text-base',
  fontWeightClass: 'font-normal',
  letterSpacingClass: 'tracking-normal',
  lineHeightClass: 'leading-relaxed',
  fontFamilyClass: 'font-sans',
  fontApplyScope: 'content',
  showExplore: true,
  showFavorites: true,
  showHistory: true,
  showNotifications: true,
  showDMs: true,
  showProfile: true,
  showCompose: true,
  showRightRail: true,
  showHotSearchCard: true,
  xbEntryCollapsed: false,
  showFollowedSuperTopicsCard: false,
  sidebarCollapsed: false,
  immersiveMode: false,
  motionPreference: 'system',
  collapseRepliesEnabled: false,
  renderReplyChainEnabled: true,
  darkModeImageDim: false,
  autoLoadLongText: false,
  feedDensity: 'standard',
  weiboCardShowAvatar: true,
  weiboCardShowTimestamp: true,
  weiboCardShowPublishInfo: true,
  weiboCardShowTitleBadge: true,
  weiboCardShowInteractionCounts: true,
  weiboCardMediaDisplay: 'expanded',
  weiboCardSingleImageMaxWidth: DEFAULT_WEIBO_CARD_SINGLE_IMAGE_MAX_WIDTH,
  weiboCardSingleVideoMaxWidth: DEFAULT_WEIBO_CARD_SINGLE_VIDEO_MAX_WIDTH,
  weiboCardMultiMediaLayout: 'grid',
  weiboCardMultiMediaGridLimit: 9,
  weiboCardMultiMediaGridMaxWidth: DEFAULT_WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH,
  weiboCardMultiMediaStripHeight: DEFAULT_WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT,
  commentDensity: 'standard',
  commentCardShowAvatar: true,
  commentCardShowTimestamp: true,
  commentCardShowPublishInfo: false,
  commentCardShowAuthorBadge: true,
  commentCardShowLikeCount: true,
  commentCardShowThreadLine: true,
  commentCardImageDisplay: 'expanded',
  commentCardCollapseRepliesByDefault: false,
  lightModeBgColor: 'white' as LightBgColorPreset,
  darkModeBgColor: 'near-black' as DarkBgColorPreset,
  imageGenEnabled: true,
  imageGenShowDataArea: true,
  imageGenShowFullImages: false,
  imageGenShowWeiboLink: false,
  imageGenTheme: 'light' as GenImageCardTheme,
  imageGenCardStyle: 'default' as CardStyle,
  hotSearchType: 'hot' as HotSearchType,
  feedInteractionMode: 'x',
  feedPrimaryActionOrder: ['comment', 'repost', 'like'],
  feedToolbarButtonIds: [],
  browsingHistoryLimit: 200,
  xbTopicPage: true,
  ratingEnabled: false,
  rememberPlaybackRate: false,
  playbackRate: 1,
  forceRedirectToFollowing: false,
  firstLoadRedirect: 'for-you',
  homeTab: 'for-you',
  homeGroupId: null,
  customThemeLightCss: '',
  customThemeDarkCss: '',
  selectedThemeType: 'preset',
  selectedThemeId: 'default',
  userThemes: [],
  photoLoopEnabled: true,
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isFontFamilyClass(value: unknown): value is FontFamilyClass {
  return FONT_FAMILY_CLASSES.includes(value as FontFamilyClass)
}

function isFontApplyScope(value: unknown): value is FontApplyScope {
  return value === 'content' || value === 'app'
}

function normalizeFontApplyScope(value: unknown): FontApplyScope {
  return isFontApplyScope(value) ? value : DEFAULT_APP_SETTINGS.fontApplyScope
}

function normalizeFontFamilyClass(value: unknown): FontFamilyClass {
  // 仓耳今楷（~27MB TTF + 不可靠 CDN）已下架
  if (
    value === 'font-canger-jinkai' ||
    value === 'font-sarasa-gothic' ||
    value === 'font-ibm-plex-sans-sc'
  ) {
    return DEFAULT_APP_SETTINGS.fontFamilyClass
  }

  return isFontFamilyClass(value) ? value : DEFAULT_APP_SETTINGS.fontFamilyClass
}

function normalizeFontSizeClass(value: unknown): FontSizeClass {
  if (isFontSizeClass(value)) return value
  // 旧版过大/过小字号钳制到阅读尺度
  if (value === 'text-xs') return 'text-sm'
  if (value === 'text-3xl' || value === 'text-4xl') return 'text-2xl'
  return DEFAULT_APP_SETTINGS.fontSizeClass
}

function normalizeFontWeightClass(value: unknown): FontWeightClass {
  if (isFontWeightClass(value)) return value
  // 旧版极细/极粗映射到可用档
  if (value === 'font-thin' || value === 'font-extralight' || value === 'font-light') {
    return 'font-normal'
  }
  if (value === 'font-extrabold' || value === 'font-black') {
    return 'font-bold'
  }
  return DEFAULT_APP_SETTINGS.fontWeightClass
}

function normalizeLetterSpacingClass(value: unknown): LetterSpacingClass {
  if (isLetterSpacingClass(value)) return value
  if (value === 'tracking-tighter') return 'tracking-tight'
  if (value === 'tracking-wider' || value === 'tracking-widest') return 'tracking-wide'
  return DEFAULT_APP_SETTINGS.letterSpacingClass
}

function normalizeLineHeightClass(value: unknown): LineHeightClass {
  if (isLineHeightClass(value)) return value
  if (value === 'leading-none' || value === 'leading-tight') return 'leading-snug'
  return DEFAULT_APP_SETTINGS.lineHeightClass
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

function isFeedInteractionMode(value: unknown): value is FeedInteractionMode {
  return value === 'x' || value === 'weibo'
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === 'system' || value === 'full' || value === 'reduced'
}

function isContentDensity(value: unknown): value is ContentDensity {
  return value === 'relaxed' || value === 'standard' || value === 'compact'
}

function isContentDisplay(value: unknown): value is ContentDisplay {
  return value === 'expanded' || value === 'collapsed'
}

function isWeiboCardMultiMediaLayout(value: unknown): value is WeiboCardMultiMediaLayout {
  return value === 'grid' || value === 'horizontal'
}

function isWeiboCardMultiMediaGridLimit(value: unknown): value is WeiboCardMultiMediaGridLimit {
  return WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS.includes(value as WeiboCardMultiMediaGridLimit)
}

function normalizeSteppedNumber(
  value: unknown,
  min: number,
  max: number,
  step: number,
  fallback: number,
) {
  const numeric = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(numeric)) return fallback

  const clamped = Math.min(max, Math.max(min, numeric))
  return Math.round((clamped - min) / step) * step + min
}

function isFeedPrimaryActionId(value: unknown): value is FeedPrimaryActionId {
  return FEED_PRIMARY_ACTION_IDS.includes(value as FeedPrimaryActionId)
}

function normalizeFeedPrimaryActionOrder(value: unknown): FeedPrimaryActionId[] {
  if (!Array.isArray(value)) {
    return DEFAULT_APP_SETTINGS.feedPrimaryActionOrder
  }

  const unique = value.filter(isFeedPrimaryActionId).filter((id, index, list) => {
    return list.indexOf(id) === index
  })

  if (unique.length !== FEED_PRIMARY_ACTION_IDS.length) {
    return DEFAULT_APP_SETTINGS.feedPrimaryActionOrder
  }

  return unique
}

function isFeedToolbarButtonId(value: unknown): value is FeedToolbarButtonId {
  return FEED_TOOLBAR_BUTTON_IDS.includes(value as FeedToolbarButtonId)
}

function normalizeFeedToolbarButtonIds(value: unknown): FeedToolbarButtonId[] {
  if (!Array.isArray(value)) {
    return DEFAULT_APP_SETTINGS.feedToolbarButtonIds
  }

  return value.filter(isFeedToolbarButtonId).filter((id, index, list) => {
    return list.indexOf(id) === index
  })
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
    value === 'text-sm' ||
    value === 'text-base' ||
    value === 'text-lg' ||
    value === 'text-xl' ||
    value === 'text-2xl'
  )
}

function isFontWeightClass(value: unknown): value is FontWeightClass {
  return (
    value === 'font-normal' ||
    value === 'font-medium' ||
    value === 'font-semibold' ||
    value === 'font-bold'
  )
}

function isLetterSpacingClass(value: unknown): value is LetterSpacingClass {
  return value === 'tracking-tight' || value === 'tracking-normal' || value === 'tracking-wide'
}

function isLineHeightClass(value: unknown): value is LineHeightClass {
  return (
    value === 'leading-snug' ||
    value === 'leading-normal' ||
    value === 'leading-relaxed' ||
    value === 'leading-loose'
  )
}

function isContentWidth(value: unknown): value is ContentWidth {
  return (
    value === 'narrower' ||
    value === 'narrow' ||
    value === 'standard' ||
    value === 'wide' ||
    value === 'wider' ||
    value === 'custom'
  )
}

export function normalizeCustomContentWidth(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(numeric)) {
    return DEFAULT_APP_SETTINGS.customContentWidth
  }

  const clamped = Math.min(CUSTOM_CONTENT_WIDTH_MAX, Math.max(CUSTOM_CONTENT_WIDTH_MIN, numeric))
  return (
    Math.round((clamped - CUSTOM_CONTENT_WIDTH_MIN) / CUSTOM_CONTENT_WIDTH_STEP) *
      CUSTOM_CONTENT_WIDTH_STEP +
    CUSTOM_CONTENT_WIDTH_MIN
  )
}

function isHomeTab(value: unknown): value is HomeTab {
  return (
    value === 'for-you' ||
    value === 'following' ||
    value === 'special-follow' ||
    value === 'friend-circle'
  )
}

function isBrowsingHistoryLimit(value: unknown): value is BrowsingHistoryLimit {
  return BROWSING_HISTORY_LIMIT_OPTIONS.includes(value as BrowsingHistoryLimit)
}

function isPlaybackRate(value: unknown): value is PlaybackRate {
  return PLAYBACK_RATE_OPTIONS.includes(value as PlaybackRate)
}

function normalizePlaybackRate(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(numeric)) {
    return DEFAULT_APP_SETTINGS.playbackRate
  }
  return isPlaybackRate(numeric) ? numeric : DEFAULT_APP_SETTINGS.playbackRate
}

function isSelectedThemeType(value: unknown): value is SelectedThemeType {
  return value === 'preset' || value === 'custom'
}

function isCustomThemePreset(value: unknown): value is CustomThemePreset {
  return (
    value === 'default' ||
    value === 'vercel' ||
    value === 'twitter' ||
    value === 'supabase' ||
    value === 'modern' ||
    value === 'claude' ||
    value === 'amethyst-haze' ||
    value === 'bubblegum' ||
    value === 'caffeine' ||
    value === 'candyland' ||
    value === 'claymorphism' ||
    value === 'nature'
  )
}

function normalizeCustomThemePreset(value: unknown): CustomThemePreset {
  if (value === 'modern-minimal') {
    return 'modern'
  }

  if (value === 'mono') {
    return 'default'
  }

  return isCustomThemePreset(value) ? value : 'default'
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_SETTINGS }
  }

  const candidate = value as Partial<AppSettings>
  const legacyCandidate = value as Record<string, unknown>

  return {
    contentWidth: isContentWidth(candidate.contentWidth)
      ? candidate.contentWidth
      : DEFAULT_APP_SETTINGS.contentWidth,
    customContentWidth: normalizeCustomContentWidth(candidate.customContentWidth),
    theme: isAppTheme(candidate.theme) ? candidate.theme : DEFAULT_APP_SETTINGS.theme,
    rewriteEnabled:
      typeof candidate.rewriteEnabled === 'boolean'
        ? candidate.rewriteEnabled
        : DEFAULT_APP_SETTINGS.rewriteEnabled,
    fontSizeClass: normalizeFontSizeClass(candidate.fontSizeClass),
    fontWeightClass: normalizeFontWeightClass(candidate.fontWeightClass),
    letterSpacingClass: normalizeLetterSpacingClass(candidate.letterSpacingClass),
    lineHeightClass: normalizeLineHeightClass(candidate.lineHeightClass),
    fontFamilyClass: normalizeFontFamilyClass(candidate.fontFamilyClass),
    fontApplyScope: normalizeFontApplyScope(candidate.fontApplyScope),
    showExplore:
      typeof candidate.showExplore === 'boolean'
        ? candidate.showExplore
        : DEFAULT_APP_SETTINGS.showExplore,
    showFavorites:
      typeof candidate.showFavorites === 'boolean'
        ? candidate.showFavorites
        : DEFAULT_APP_SETTINGS.showFavorites,
    showHistory:
      typeof candidate.showHistory === 'boolean'
        ? candidate.showHistory
        : DEFAULT_APP_SETTINGS.showHistory,
    showNotifications:
      typeof candidate.showNotifications === 'boolean'
        ? candidate.showNotifications
        : DEFAULT_APP_SETTINGS.showNotifications,
    showDMs:
      typeof candidate.showDMs === 'boolean' ? candidate.showDMs : DEFAULT_APP_SETTINGS.showDMs,
    showProfile:
      typeof candidate.showProfile === 'boolean'
        ? candidate.showProfile
        : DEFAULT_APP_SETTINGS.showProfile,
    showCompose:
      typeof candidate.showCompose === 'boolean'
        ? candidate.showCompose
        : DEFAULT_APP_SETTINGS.showCompose,
    showRightRail:
      typeof candidate.showRightRail === 'boolean'
        ? candidate.showRightRail
        : DEFAULT_APP_SETTINGS.showRightRail,
    showHotSearchCard:
      typeof candidate.showHotSearchCard === 'boolean'
        ? candidate.showHotSearchCard
        : DEFAULT_APP_SETTINGS.showHotSearchCard,
    xbEntryCollapsed:
      typeof candidate.xbEntryCollapsed === 'boolean'
        ? candidate.xbEntryCollapsed
        : DEFAULT_APP_SETTINGS.xbEntryCollapsed,
    showFollowedSuperTopicsCard:
      typeof candidate.showFollowedSuperTopicsCard === 'boolean'
        ? candidate.showFollowedSuperTopicsCard
        : DEFAULT_APP_SETTINGS.showFollowedSuperTopicsCard,
    sidebarCollapsed:
      typeof candidate.sidebarCollapsed === 'boolean'
        ? candidate.sidebarCollapsed
        : DEFAULT_APP_SETTINGS.sidebarCollapsed,
    immersiveMode:
      typeof candidate.immersiveMode === 'boolean'
        ? candidate.immersiveMode
        : DEFAULT_APP_SETTINGS.immersiveMode,
    motionPreference: isMotionPreference(candidate.motionPreference)
      ? candidate.motionPreference
      : DEFAULT_APP_SETTINGS.motionPreference,
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
    autoLoadLongText:
      typeof candidate.autoLoadLongText === 'boolean'
        ? candidate.autoLoadLongText
        : DEFAULT_APP_SETTINGS.autoLoadLongText,
    feedDensity: isContentDensity(candidate.feedDensity)
      ? candidate.feedDensity
      : DEFAULT_APP_SETTINGS.feedDensity,
    weiboCardShowAvatar:
      typeof candidate.weiboCardShowAvatar === 'boolean'
        ? candidate.weiboCardShowAvatar
        : DEFAULT_APP_SETTINGS.weiboCardShowAvatar,
    weiboCardShowTimestamp:
      typeof candidate.weiboCardShowTimestamp === 'boolean'
        ? candidate.weiboCardShowTimestamp
        : DEFAULT_APP_SETTINGS.weiboCardShowTimestamp,
    weiboCardShowPublishInfo:
      typeof candidate.weiboCardShowPublishInfo === 'boolean'
        ? candidate.weiboCardShowPublishInfo
        : DEFAULT_APP_SETTINGS.weiboCardShowPublishInfo,
    weiboCardShowTitleBadge:
      typeof candidate.weiboCardShowTitleBadge === 'boolean'
        ? candidate.weiboCardShowTitleBadge
        : DEFAULT_APP_SETTINGS.weiboCardShowTitleBadge,
    weiboCardShowInteractionCounts:
      typeof candidate.weiboCardShowInteractionCounts === 'boolean'
        ? candidate.weiboCardShowInteractionCounts
        : DEFAULT_APP_SETTINGS.weiboCardShowInteractionCounts,
    weiboCardMediaDisplay: isContentDisplay(candidate.weiboCardMediaDisplay)
      ? candidate.weiboCardMediaDisplay
      : DEFAULT_APP_SETTINGS.weiboCardMediaDisplay,
    weiboCardSingleImageMaxWidth: normalizeSteppedNumber(
      candidate.weiboCardSingleImageMaxWidth,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP,
      DEFAULT_APP_SETTINGS.weiboCardSingleImageMaxWidth,
    ),
    weiboCardSingleVideoMaxWidth: normalizeSteppedNumber(
      candidate.weiboCardSingleVideoMaxWidth,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX,
      WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP,
      DEFAULT_APP_SETTINGS.weiboCardSingleVideoMaxWidth,
    ),
    weiboCardMultiMediaLayout: isWeiboCardMultiMediaLayout(candidate.weiboCardMultiMediaLayout)
      ? candidate.weiboCardMultiMediaLayout
      : DEFAULT_APP_SETTINGS.weiboCardMultiMediaLayout,
    weiboCardMultiMediaGridLimit: isWeiboCardMultiMediaGridLimit(
      candidate.weiboCardMultiMediaGridLimit,
    )
      ? candidate.weiboCardMultiMediaGridLimit
      : DEFAULT_APP_SETTINGS.weiboCardMultiMediaGridLimit,
    weiboCardMultiMediaGridMaxWidth: normalizeSteppedNumber(
      candidate.weiboCardMultiMediaGridMaxWidth,
      WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MIN,
      WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MAX,
      WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_STEP,
      DEFAULT_APP_SETTINGS.weiboCardMultiMediaGridMaxWidth,
    ),
    weiboCardMultiMediaStripHeight: normalizeSteppedNumber(
      candidate.weiboCardMultiMediaStripHeight,
      WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MIN,
      WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MAX,
      WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_STEP,
      DEFAULT_APP_SETTINGS.weiboCardMultiMediaStripHeight,
    ),
    commentDensity: isContentDensity(candidate.commentDensity)
      ? candidate.commentDensity
      : DEFAULT_APP_SETTINGS.commentDensity,
    commentCardShowAvatar:
      typeof candidate.commentCardShowAvatar === 'boolean'
        ? candidate.commentCardShowAvatar
        : DEFAULT_APP_SETTINGS.commentCardShowAvatar,
    commentCardShowTimestamp:
      typeof candidate.commentCardShowTimestamp === 'boolean'
        ? candidate.commentCardShowTimestamp
        : DEFAULT_APP_SETTINGS.commentCardShowTimestamp,
    commentCardShowPublishInfo:
      typeof candidate.commentCardShowPublishInfo === 'boolean'
        ? candidate.commentCardShowPublishInfo
        : DEFAULT_APP_SETTINGS.commentCardShowPublishInfo,
    commentCardShowAuthorBadge:
      typeof candidate.commentCardShowAuthorBadge === 'boolean'
        ? candidate.commentCardShowAuthorBadge
        : DEFAULT_APP_SETTINGS.commentCardShowAuthorBadge,
    commentCardShowLikeCount:
      typeof candidate.commentCardShowLikeCount === 'boolean'
        ? candidate.commentCardShowLikeCount
        : DEFAULT_APP_SETTINGS.commentCardShowLikeCount,
    commentCardShowThreadLine:
      typeof candidate.commentCardShowThreadLine === 'boolean'
        ? candidate.commentCardShowThreadLine
        : DEFAULT_APP_SETTINGS.commentCardShowThreadLine,
    commentCardImageDisplay: isContentDisplay(candidate.commentCardImageDisplay)
      ? candidate.commentCardImageDisplay
      : DEFAULT_APP_SETTINGS.commentCardImageDisplay,
    commentCardCollapseRepliesByDefault:
      typeof candidate.commentCardCollapseRepliesByDefault === 'boolean'
        ? candidate.commentCardCollapseRepliesByDefault
        : DEFAULT_APP_SETTINGS.commentCardCollapseRepliesByDefault,
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
    feedInteractionMode: isFeedInteractionMode(candidate.feedInteractionMode)
      ? candidate.feedInteractionMode
      : typeof legacyCandidate.xLayoutEnabled === 'boolean'
        ? legacyCandidate.xLayoutEnabled
          ? 'x'
          : 'weibo'
        : DEFAULT_APP_SETTINGS.feedInteractionMode,
    feedPrimaryActionOrder: normalizeFeedPrimaryActionOrder(candidate.feedPrimaryActionOrder),
    feedToolbarButtonIds: normalizeFeedToolbarButtonIds(candidate.feedToolbarButtonIds),
    browsingHistoryLimit: isBrowsingHistoryLimit(candidate.browsingHistoryLimit)
      ? candidate.browsingHistoryLimit
      : DEFAULT_APP_SETTINGS.browsingHistoryLimit,
    xbTopicPage:
      typeof candidate.xbTopicPage === 'boolean'
        ? candidate.xbTopicPage
        : DEFAULT_APP_SETTINGS.xbTopicPage,
    ratingEnabled:
      typeof candidate.ratingEnabled === 'boolean'
        ? candidate.ratingEnabled
        : DEFAULT_APP_SETTINGS.ratingEnabled,
    rememberPlaybackRate:
      typeof candidate.rememberPlaybackRate === 'boolean'
        ? candidate.rememberPlaybackRate
        : DEFAULT_APP_SETTINGS.rememberPlaybackRate,
    playbackRate: normalizePlaybackRate(candidate.playbackRate),
    forceRedirectToFollowing:
      typeof candidate.forceRedirectToFollowing === 'boolean'
        ? candidate.forceRedirectToFollowing
        : DEFAULT_APP_SETTINGS.forceRedirectToFollowing,
    firstLoadRedirect: isHomeTab(candidate.firstLoadRedirect)
      ? candidate.firstLoadRedirect
      : DEFAULT_APP_SETTINGS.firstLoadRedirect,
    homeTab: isHomeTab(candidate.homeTab) ? candidate.homeTab : DEFAULT_APP_SETTINGS.homeTab,
    homeGroupId:
      typeof candidate.homeGroupId === 'string' && candidate.homeGroupId.trim()
        ? candidate.homeGroupId
        : null,
    customThemeLightCss:
      typeof candidate.customThemeLightCss === 'string'
        ? candidate.customThemeLightCss
        : DEFAULT_APP_SETTINGS.customThemeLightCss,
    customThemeDarkCss:
      typeof candidate.customThemeDarkCss === 'string'
        ? candidate.customThemeDarkCss
        : DEFAULT_APP_SETTINGS.customThemeDarkCss,
    selectedThemeType: isSelectedThemeType(candidate.selectedThemeType)
      ? candidate.selectedThemeType
      : (candidate as Record<string, unknown>).customThemeEnabled === true
        ? 'custom'
        : DEFAULT_APP_SETTINGS.selectedThemeType,
    selectedThemeId:
      typeof candidate.selectedThemeId === 'string' && candidate.selectedThemeId.length > 0
        ? candidate.selectedThemeId === 'mono'
          ? 'default'
          : candidate.selectedThemeId
        : typeof (candidate as Record<string, unknown>).customThemePreset === 'string'
          ? normalizeCustomThemePreset((candidate as Record<string, unknown>).customThemePreset)
          : DEFAULT_APP_SETTINGS.selectedThemeId,
    userThemes: Array.isArray(candidate.userThemes)
      ? candidate.userThemes.filter(
          (t: unknown): t is UserTheme =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as UserTheme).id === 'string' &&
            typeof (t as UserTheme).name === 'string',
        )
      : DEFAULT_APP_SETTINGS.userThemes,
    photoLoopEnabled:
      typeof candidate.photoLoopEnabled === 'boolean'
        ? candidate.photoLoopEnabled
        : DEFAULT_APP_SETTINGS.photoLoopEnabled,
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
