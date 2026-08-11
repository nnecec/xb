import { describe, expect, it, vi } from 'vitest'

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  normalizeAppSettings,
  persistAppSettings,
  resolveIsDarkMode,
} from '@/lib/app-settings'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      [APP_SETTINGS_STORAGE_KEY]: stored,
    })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      stored = items[APP_SETTINGS_STORAGE_KEY]
    }),
    read() {
      return stored
    },
  }
}

describe('app-settings', () => {
  it('normalizes invalid values to the defaults', () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS)
    expect(
      normalizeAppSettings({
        theme: 'unknown',
        rewriteEnabled: 'no',
      }),
    ).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('migrates the old modern minimal preset key to modern', () => {
    expect(
      normalizeAppSettings({
        customThemePreset: 'modern-minimal' as never,
      }).selectedThemeId,
    ).toBe('modern')
  })

  it('migrates the old x layout setting to the feed interaction mode', () => {
    expect(normalizeAppSettings({ xLayoutEnabled: true }).feedInteractionMode).toBe('x')
    expect(normalizeAppSettings({ xLayoutEnabled: false }).feedInteractionMode).toBe('weibo')
  })

  it('migrates legacy font options to reading-scale defaults', () => {
    expect(normalizeAppSettings({ fontSizeClass: 'text-xs' }).contentFontSize).toBe(14)
    expect(normalizeAppSettings({ fontSizeClass: 'text-4xl' }).contentFontSize).toBe(24)
    expect(normalizeAppSettings({ uiFontSize: 20 }).uiFontSize).toBe(20)
    expect(normalizeAppSettings({ uiFontSize: 13 as never }).uiFontSize).toBe(14)
    expect(normalizeAppSettings({ contentFontSize: 32 }).contentFontSize).toBe(32)
    expect(normalizeAppSettings({ contentFontSize: 30 as never }).contentFontSize).toBe(16)
    expect(normalizeAppSettings({ fontWeightClass: 'font-thin' as never }).fontWeightClass).toBe(
      'font-normal',
    )
    expect(normalizeAppSettings({ fontWeightClass: 'font-black' as never }).fontWeightClass).toBe(
      'font-bold',
    )
    expect(
      normalizeAppSettings({ letterSpacingClass: 'tracking-widest' as never }).letterSpacingClass,
    ).toBe('tracking-wide')
    expect(normalizeAppSettings({ lineHeightClass: 'leading-none' as never }).lineHeightClass).toBe(
      'leading-snug',
    )
    expect(
      normalizeAppSettings({ fontFamilyClass: 'font-canger-jinkai' as never }).fontFamilyClass,
    ).toBe('font-sans')
    expect(
      normalizeAppSettings({ fontFamilyClass: 'font-lxgw-neo-xihei' as never }).fontFamilyClass,
    ).toBe('font-lxgw-neo-xihei')
    expect(normalizeAppSettings({}).fontApplyScope).toBe('content')
    expect(normalizeAppSettings({ fontApplyScope: 'app' }).fontApplyScope).toBe('app')
    expect(normalizeAppSettings({ fontApplyScope: 'unknown' as never }).fontApplyScope).toBe(
      'content',
    )
  })

  it('normalizes feed toolbar settings', () => {
    expect(
      normalizeAppSettings({
        feedPrimaryActionOrder: ['like', 'comment', 'repost'],
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feedPrimaryActionOrder,
    ).toEqual(['like', 'comment', 'repost'])
    expect(
      normalizeAppSettings({
        feedPrimaryActionOrder: ['like', 'comment'],
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feedPrimaryActionOrder,
    ).toEqual(DEFAULT_APP_SETTINGS.feedPrimaryActionOrder)
    expect(
      normalizeAppSettings({
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feedToolbarButtonIds,
    ).toEqual(['copy-text', 'favorite'])
  })

  it('loads and persists settings through storage', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      uiFontSize: 14,
      contentFontSize: 14,
      fontFamilyClass: 'font-serif',
      showHotSearchCard: false,
    })

    expect(await loadAppSettings(storage)).toEqual({
      contentWidth: 'standard',
      customContentWidth: 1200,
      theme: 'dark',
      rewriteEnabled: false,
      uiFontSize: 14,
      contentFontSize: 14,
      fontWeightClass: 'font-normal',
      letterSpacingClass: 'tracking-normal',
      lineHeightClass: 'leading-relaxed',
      fontFamilyClass: 'font-serif',
      fontApplyScope: 'content',
      showHotSearchCard: false,
      showFollowedSuperTopicsCard: false,
      showExplore: true,
      showFavorites: true,
      showHistory: true,
      showNotifications: true,
      showDMs: true,
      showProfile: true,
      showCompose: true,
      showRightRail: true,
      xbEntryCollapsed: false,
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
      weiboCardCollapsedMediaTypes: [],
      weiboCardSingleImageMaxWidth: 450,
      weiboCardSingleVideoMaxWidth: 650,
      weiboCardMultiMediaLayout: 'grid',
      weiboCardMultiMediaGridLimit: 9,
      weiboCardMultiMediaGridMaxWidth: 650,
      weiboCardMultiMediaStripHeight: 360,
      commentDensity: 'standard',
      commentCardShowAvatar: true,
      commentCardShowTimestamp: true,
      commentCardShowPublishInfo: true,
      commentCardShowAuthorBadge: true,
      commentCardShowLikeCount: true,
      commentCardShowThreadLine: true,
      commentCardImageDisplay: 'expanded',
      commentCardCollapseRepliesByDefault: false,
      lightModeBgColor: 'white',
      darkModeBgColor: 'near-black',
      imageGenEnabled: true,
      imageGenShowDataArea: true,
      imageGenShowFullImages: false,
      imageGenShowWeiboLink: false,
      imageGenTheme: 'light',
      imageGenCardStyle: 'default',
      hotSearchType: 'hot',
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
    })

    await persistAppSettings(
      {
        contentWidth: 'standard',
        customContentWidth: 1200,
        theme: 'light',
        rewriteEnabled: true,
        uiFontSize: 18,
        contentFontSize: 28,
        fontWeightClass: 'font-medium',
        letterSpacingClass: 'tracking-wide',
        lineHeightClass: 'leading-loose',
        fontFamilyClass: 'font-serif',
        fontApplyScope: 'app',
        showHotSearchCard: true,
        showFollowedSuperTopicsCard: false,
        showExplore: true,
        showFavorites: true,
        showHistory: true,
        showNotifications: true,
        showDMs: true,
        showProfile: true,
        showCompose: true,
        showRightRail: true,
        xbEntryCollapsed: false,
        sidebarCollapsed: false,
        immersiveMode: true,
        motionPreference: 'reduced',
        collapseRepliesEnabled: false,
        renderReplyChainEnabled: true,
        darkModeImageDim: false,
        autoLoadLongText: false,
        feedDensity: 'compact',
        weiboCardShowAvatar: false,
        weiboCardShowTimestamp: true,
        weiboCardShowPublishInfo: false,
        weiboCardShowTitleBadge: true,
        weiboCardShowInteractionCounts: false,
        weiboCardCollapsedMediaTypes: ['image', 'multiple'],
        weiboCardSingleImageMaxWidth: 520,
        weiboCardSingleVideoMaxWidth: 760,
        weiboCardMultiMediaLayout: 'horizontal',
        weiboCardMultiMediaGridLimit: 12,
        weiboCardMultiMediaGridMaxWidth: 800,
        weiboCardMultiMediaStripHeight: 480,
        commentDensity: 'relaxed',
        commentCardShowAvatar: false,
        commentCardShowTimestamp: true,
        commentCardShowPublishInfo: true,
        commentCardShowAuthorBadge: false,
        commentCardShowLikeCount: false,
        commentCardShowThreadLine: false,
        commentCardImageDisplay: 'collapsed',
        commentCardCollapseRepliesByDefault: true,
        lightModeBgColor: 'paper',
        darkModeBgColor: 'dark-gray',
        imageGenEnabled: true,
        imageGenShowDataArea: true,
        imageGenShowFullImages: false,
        imageGenShowWeiboLink: false,
        imageGenTheme: 'light',
        imageGenCardStyle: 'default',
        hotSearchType: 'mine',
        feedInteractionMode: 'x',
        feedPrimaryActionOrder: ['comment', 'repost', 'like'],
        feedToolbarButtonIds: [],
        browsingHistoryLimit: 300,
        xbTopicPage: true,
        ratingEnabled: true,
        rememberPlaybackRate: false,
        playbackRate: 1,
        forceRedirectToFollowing: false,
        firstLoadRedirect: 'for-you',
        homeTab: 'for-you',
        homeGroupId: null,
        customThemeLightCss: '--primary: #1d9bf0;',
        customThemeDarkCss: '--primary: #1d9bf0;',
        selectedThemeType: 'preset',
        selectedThemeId: 'default',
        userThemes: [],
        photoLoopEnabled: true,
      },
      storage,
    )

    expect(storage.read()).toEqual({
      contentWidth: 'standard',
      customContentWidth: 1200,
      theme: 'light',
      rewriteEnabled: true,
      uiFontSize: 18,
      contentFontSize: 28,
      fontWeightClass: 'font-medium',
      letterSpacingClass: 'tracking-wide',
      lineHeightClass: 'leading-loose',
      fontFamilyClass: 'font-serif',
      fontApplyScope: 'app',
      showHotSearchCard: true,
      showFollowedSuperTopicsCard: false,
      showExplore: true,
      showFavorites: true,
      showHistory: true,
      showNotifications: true,
      showDMs: true,
      showProfile: true,
      showCompose: true,
      showRightRail: true,
      xbEntryCollapsed: false,
      sidebarCollapsed: false,
      immersiveMode: true,
      motionPreference: 'reduced',
      collapseRepliesEnabled: false,
      renderReplyChainEnabled: true,
      darkModeImageDim: false,
      autoLoadLongText: false,
      feedDensity: 'compact',
      weiboCardShowAvatar: false,
      weiboCardShowTimestamp: true,
      weiboCardShowPublishInfo: false,
      weiboCardShowTitleBadge: true,
      weiboCardShowInteractionCounts: false,
      weiboCardCollapsedMediaTypes: ['image', 'multiple'],
      weiboCardSingleImageMaxWidth: 520,
      weiboCardSingleVideoMaxWidth: 760,
      weiboCardMultiMediaLayout: 'horizontal',
      weiboCardMultiMediaGridLimit: 12,
      weiboCardMultiMediaGridMaxWidth: 800,
      weiboCardMultiMediaStripHeight: 480,
      commentDensity: 'relaxed',
      commentCardShowAvatar: false,
      commentCardShowTimestamp: true,
      commentCardShowPublishInfo: true,
      commentCardShowAuthorBadge: false,
      commentCardShowLikeCount: false,
      commentCardShowThreadLine: false,
      commentCardImageDisplay: 'collapsed',
      commentCardCollapseRepliesByDefault: true,
      lightModeBgColor: 'paper',
      darkModeBgColor: 'dark-gray',
      imageGenEnabled: true,
      imageGenShowDataArea: true,
      imageGenShowFullImages: false,
      imageGenShowWeiboLink: false,
      imageGenTheme: 'light',
      imageGenCardStyle: 'default',
      hotSearchType: 'mine',
      feedInteractionMode: 'x',
      feedPrimaryActionOrder: ['comment', 'repost', 'like'],
      feedToolbarButtonIds: [],
      browsingHistoryLimit: 300,
      xbTopicPage: true,
      ratingEnabled: true,
      rememberPlaybackRate: false,
      playbackRate: 1,
      forceRedirectToFollowing: false,
      firstLoadRedirect: 'for-you',
      homeTab: 'for-you',
      homeGroupId: null,
      customThemeLightCss: '--primary: #1d9bf0;',
      customThemeDarkCss: '--primary: #1d9bf0;',
      selectedThemeType: 'preset',
      selectedThemeId: 'default',
      userThemes: [],
      photoLoopEnabled: true,
    })
  })

  it('resolves dark mode from theme preference', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })

  it('normalizes playback rate and remember switch values', () => {
    expect(normalizeAppSettings({ playbackRate: 0.5 }).playbackRate).toBe(0.5)
    expect(normalizeAppSettings({ playbackRate: 1.5 }).playbackRate).toBe(1.5)
    expect(normalizeAppSettings({ playbackRate: 2 }).playbackRate).toBe(2)

    expect(normalizeAppSettings({ playbackRate: 1.1 }).playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 3 }).playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 0 }).playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 'fast' as never }).playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: null as never }).playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: Number.NaN as never }).playbackRate).toBe(1)

    expect(normalizeAppSettings({ rememberPlaybackRate: true }).rememberPlaybackRate).toBe(true)
    expect(
      normalizeAppSettings({ rememberPlaybackRate: 'yes' as never }).rememberPlaybackRate,
    ).toBe(false)
  })

  it('normalizes reading preferences and custom content widths', () => {
    expect(normalizeAppSettings({ autoLoadLongText: true }).autoLoadLongText).toBe(true)
    expect(normalizeAppSettings({ motionPreference: 'reduced' }).motionPreference).toBe('reduced')
    expect(normalizeAppSettings({ motionPreference: 'unknown' as never }).motionPreference).toBe(
      'system',
    )
    expect(normalizeAppSettings({ feedDensity: 'compact' }).feedDensity).toBe('compact')
    expect(normalizeAppSettings({ commentDensity: 'relaxed' }).commentDensity).toBe('relaxed')
    expect(
      normalizeAppSettings({
        weiboCardCollapsedMediaTypes: ['audio', 'image', 'audio', 'unknown'],
      }).weiboCardCollapsedMediaTypes,
    ).toEqual(['image', 'audio'])
    expect(
      normalizeAppSettings({ weiboCardMediaDisplay: 'collapsed' } as never)
        .weiboCardCollapsedMediaTypes,
    ).toEqual([])
    expect(
      normalizeAppSettings({ weiboCardMultiMediaLayout: 'horizontal' }).weiboCardMultiMediaLayout,
    ).toBe('horizontal')
    expect(
      normalizeAppSettings({ weiboCardMultiMediaLayout: 'masonry' as never })
        .weiboCardMultiMediaLayout,
    ).toBe('grid')
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridLimit: 12 }).weiboCardMultiMediaGridLimit,
    ).toBe(12)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridLimit: 8 as never })
        .weiboCardMultiMediaGridLimit,
    ).toBe(9)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridMaxWidth: 874 })
        .weiboCardMultiMediaGridMaxWidth,
    ).toBe(850)
    expect(
      normalizeAppSettings({ weiboCardSingleImageMaxWidth: 155 }).weiboCardSingleImageMaxWidth,
    ).toBe(160)
    expect(
      normalizeAppSettings({ weiboCardSingleImageMaxWidth: 456 }).weiboCardSingleImageMaxWidth,
    ).toBe(460)
    expect(
      normalizeAppSettings({ weiboCardSingleVideoMaxWidth: 1400 }).weiboCardSingleVideoMaxWidth,
    ).toBe(1200)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridMaxWidth: 1000 })
        .weiboCardMultiMediaGridMaxWidth,
    ).toBe(900)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaStripHeight: 391 }).weiboCardMultiMediaStripHeight,
    ).toBe(400)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaStripHeight: 100 }).weiboCardMultiMediaStripHeight,
    ).toBe(200)
    expect(
      normalizeAppSettings({ commentCardImageDisplay: 'invalid' as never }).commentCardImageDisplay,
    ).toBe('expanded')
    expect(normalizeAppSettings({ weiboCardShowAvatar: false }).weiboCardShowAvatar).toBe(false)
    expect(
      normalizeAppSettings({ commentCardShowPublishInfo: true }).commentCardShowPublishInfo,
    ).toBe(true)
    expect(normalizeAppSettings({ customContentWidth: 801 }).customContentWidth).toBe(800)
    expect(normalizeAppSettings({ customContentWidth: 1511 }).customContentWidth).toBe(1520)
    expect(normalizeAppSettings({ customContentWidth: 2000 }).customContentWidth).toBe(2000)
    expect(normalizeAppSettings({ customContentWidth: 2400 }).customContentWidth).toBe(2000)
    expect(normalizeAppSettings({ customContentWidth: 0 }).customContentWidth).toBe(800)
    expect(normalizeAppSettings({ customContentWidth: 'wide' as never }).customContentWidth).toBe(
      1200,
    )
    expect(normalizeAppSettings({ contentWidth: 'narrower' }).contentWidth).toBe('narrower')
    expect(normalizeAppSettings({ contentWidth: 'narrow' }).contentWidth).toBe('narrow')
    expect(normalizeAppSettings({ contentWidth: 'custom' }).contentWidth).toBe('custom')
    expect(normalizeAppSettings({ immersiveMode: true }).immersiveMode).toBe(true)
    expect(normalizeAppSettings({ immersiveMode: 'yes' as never }).immersiveMode).toBe(false)
  })
})
