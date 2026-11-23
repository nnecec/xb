import { describe, expect, it, vi } from 'vitest'

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type FlatAppSettings,
  loadAppSettings,
  normalizeAppSettings,
  normalizeCommentCardSettings,
  normalizePlaybackSessionSettings,
  normalizeWeiboCardSettings,
  persistAppSettings,
  resolveIsDarkMode,
} from '@/lib/app-settings'

function flattenSettings(settings: AppSettings): FlatAppSettings {
  return {
    ...settings.appearance,
    ...settings.navigation,
    ...settings.feed,
    ...settings.imageGen,
    ...settings.home,
    ...settings.features,
    ...settings.media,
    ...settings.themes,
  }
}

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

describe('卡片设置', () => {
  it('损坏的微博卡片和评论卡片各自回到默认', () => {
    expect(
      normalizeWeiboCardSettings({
        weiboCardShowAvatar: 'yes',
        weiboCardCollapsedMediaTypes: ['image', 'poster'],
      }),
    ).toMatchObject({
      weiboCardShowAvatar: DEFAULT_APP_SETTINGS.feed.weiboCardShowAvatar,
      weiboCardCollapsedMediaTypes: ['image'],
    })
    expect(
      normalizeCommentCardSettings({
        commentCardShowAvatar: 1,
        commentCardImageDisplay: 'invalid',
      }),
    ).toMatchObject({
      commentCardShowAvatar: DEFAULT_APP_SETTINGS.feed.commentCardShowAvatar,
      commentCardImageDisplay: DEFAULT_APP_SETTINGS.feed.commentCardImageDisplay,
    })
  })
})

describe('播放会话设置', () => {
  it('损坏的倍速和清晰度回到默认', () => {
    expect(
      normalizePlaybackSessionSettings({
        playbackRate: 1.1,
        rememberPlaybackRate: 'yes',
        videoQualityPreference: '  ',
      }),
    ).toEqual({
      playbackRate: DEFAULT_APP_SETTINGS.media.playbackRate,
      rememberPlaybackRate: DEFAULT_APP_SETTINGS.media.rememberPlaybackRate,
      videoQualityPreference: null,
    })
    expect(
      normalizePlaybackSessionSettings({
        playbackRate: 1.5,
        rememberPlaybackRate: true,
        videoQualityPreference: ' 1080P ',
      }),
    ).toEqual({
      playbackRate: 1.5,
      rememberPlaybackRate: true,
      videoQualityPreference: '1080p',
    })
  })
})

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
      }).themes.selectedThemeId,
    ).toBe('modern')
  })

  it('migrates the old x layout setting to the feed interaction mode', () => {
    expect(normalizeAppSettings({ xLayoutEnabled: true }).feed.feedInteractionMode).toBe('x')
    expect(normalizeAppSettings({ xLayoutEnabled: false }).feed.feedInteractionMode).toBe('weibo')
  })

  it('normalizes the merged reply-chain display setting and omits deleted settings', () => {
    expect(normalizeAppSettings({ replyChainDisplay: 'plain' }).feed.replyChainDisplay).toBe(
      'plain',
    )
    expect(normalizeAppSettings({ replyChainDisplay: 'collapsed' }).feed.replyChainDisplay).toBe(
      'collapsed',
    )
    expect(
      normalizeAppSettings({ replyChainDisplay: 'unknown' as never }).feed.replyChainDisplay,
    ).toBe('expanded')

    const normalized = normalizeAppSettings({
      renderReplyChainEnabled: false,
      collapseRepliesEnabled: true,
      forceRedirectToFollowing: true,
      imageGenEnabled: true,
    })
    expect(normalized.feed.replyChainDisplay).toBe('expanded')
    expect(normalized).not.toHaveProperty('renderReplyChainEnabled')
    expect(normalized).not.toHaveProperty('collapseRepliesEnabled')
    expect(normalized).not.toHaveProperty('forceRedirectToFollowing')
    expect(normalized).not.toHaveProperty('imageGenEnabled')
  })

  it('migrates legacy font options to reading-scale defaults', () => {
    expect(normalizeAppSettings({ fontSizeClass: 'text-xs' }).appearance.contentFontSize).toBe(14)
    expect(normalizeAppSettings({ fontSizeClass: 'text-4xl' }).appearance.contentFontSize).toBe(24)
    expect(normalizeAppSettings({ uiFontSize: 20 }).appearance.uiFontSize).toBe(20)
    expect(normalizeAppSettings({ uiFontSize: 13 as never }).appearance.uiFontSize).toBe(14)
    expect(normalizeAppSettings({ contentFontSize: 32 }).appearance.contentFontSize).toBe(32)
    expect(normalizeAppSettings({ contentFontSize: 30 as never }).appearance.contentFontSize).toBe(
      16,
    )
    expect(
      normalizeAppSettings({ fontWeightClass: 'font-thin' as never }).appearance.fontWeightClass,
    ).toBe('font-normal')
    expect(
      normalizeAppSettings({ fontWeightClass: 'font-black' as never }).appearance.fontWeightClass,
    ).toBe('font-bold')
    expect(
      normalizeAppSettings({ letterSpacingClass: 'tracking-widest' as never }).appearance
        .letterSpacingClass,
    ).toBe('tracking-wide')
    expect(
      normalizeAppSettings({ lineHeightClass: 'leading-none' as never }).appearance.lineHeightClass,
    ).toBe('leading-snug')
    expect(
      normalizeAppSettings({ fontFamilyClass: 'font-canger-jinkai' as never }).appearance
        .fontFamilyClass,
    ).toBe('font-sans')
    expect(
      normalizeAppSettings({ fontFamilyClass: 'font-lxgw-neo-xihei' as never }).appearance
        .fontFamilyClass,
    ).toBe('font-lxgw-neo-xihei')
    expect(normalizeAppSettings({}).appearance.fontApplyScope).toBe('content')
    expect(normalizeAppSettings({ fontApplyScope: 'app' }).appearance.fontApplyScope).toBe('app')
    expect(
      normalizeAppSettings({ fontApplyScope: 'unknown' as never }).appearance.fontApplyScope,
    ).toBe('content')
  })

  it('normalizes feed toolbar settings', () => {
    expect(
      normalizeAppSettings({
        feedPrimaryActionOrder: ['like', 'comment', 'repost'],
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feed.feedPrimaryActionOrder,
    ).toEqual(['like', 'comment', 'repost'])
    expect(
      normalizeAppSettings({
        feedPrimaryActionOrder: ['like', 'comment'],
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feed.feedPrimaryActionOrder,
    ).toEqual(DEFAULT_APP_SETTINGS.feed.feedPrimaryActionOrder)
    expect(
      normalizeAppSettings({
        feedToolbarButtonIds: ['copy-text', 'unknown', 'favorite', 'favorite'],
      }).feed.feedToolbarButtonIds,
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
      ...DEFAULT_APP_SETTINGS,
      appearance: {
        ...DEFAULT_APP_SETTINGS.appearance,
        theme: 'dark',
        rewriteEnabled: false,
        uiFontSize: 14,
        contentFontSize: 14,
        fontFamilyClass: 'font-serif',
      },
    })

    const nextSettings = normalizeAppSettings({
      ...flattenSettings(DEFAULT_APP_SETTINGS),
      columnWidth: 'custom' as const,
      customColumnWidth: 500,
      theme: 'light' as const,
      uiFontSize: 18 as const,
      contentFontSize: 28 as const,
      fontWeightClass: 'font-medium' as const,
      letterSpacingClass: 'tracking-wide' as const,
      lineHeightClass: 'leading-loose' as const,
      fontFamilyClass: 'font-serif' as const,
      fontApplyScope: 'app' as const,
      motionPreference: 'reduced' as const,
      feedDensity: 'compact' as const,
      weiboCardShowAvatar: false,
      weiboCardShowPublishInfo: false,
      weiboCardShowInteractionCounts: false,
      weiboCardCollapsedMediaTypes: ['image', 'multiple'] as ('image' | 'multiple')[],
      weiboCardSingleImageMaxWidth: 520,
      weiboCardSingleVideoMaxWidth: 760,
      weiboCardMultiMediaLayout: 'horizontal' as const,
      weiboCardMultiMediaGridLimit: 12 as const,
      weiboCardMultiMediaGridMaxWidth: 800,
      weiboCardMultiMediaStripHeight: 480,
      commentDensity: 'relaxed' as const,
      commentCardShowAvatar: false,
      commentCardShowAuthorBadge: false,
      commentCardShowLikeCount: false,
      commentCardShowThreadLine: false,
      commentCardImageDisplay: 'collapsed' as const,
      commentCardCollapseRepliesByDefault: true,
      lightModeBgColor: 'paper' as const,
      darkModeBgColor: 'dark-gray' as const,
      hotSearchType: 'mine' as const,
      browsingHistoryLimit: 300 as const,
      ratingEnabled: true,
      videoQualityPreference: '1080p',
      customThemeLightCss: '--primary: #1d9bf0;',
      customThemeDarkCss: '--primary: #1d9bf0;',
    })

    await persistAppSettings(nextSettings, storage)
    expect(storage.read()).toEqual(nextSettings)
  })

  it('resolves dark mode from theme preference', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })

  it('normalizes playback rate and remember switch values', () => {
    expect(normalizeAppSettings({ playbackRate: 0.5 }).media.playbackRate).toBe(0.5)
    expect(normalizeAppSettings({ playbackRate: 1.5 }).media.playbackRate).toBe(1.5)
    expect(normalizeAppSettings({ playbackRate: 2 }).media.playbackRate).toBe(2)

    expect(normalizeAppSettings({ playbackRate: 1.1 }).media.playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 3 }).media.playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 0 }).media.playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: 'fast' as never }).media.playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: null as never }).media.playbackRate).toBe(1)
    expect(normalizeAppSettings({ playbackRate: Number.NaN as never }).media.playbackRate).toBe(1)

    expect(normalizeAppSettings({ rememberPlaybackRate: true }).media.rememberPlaybackRate).toBe(
      true,
    )
    expect(
      normalizeAppSettings({ rememberPlaybackRate: 'yes' as never }).media.rememberPlaybackRate,
    ).toBe(false)
    expect(
      normalizeAppSettings({ videoQualityPreference: ' 1080P ' }).media.videoQualityPreference,
    ).toBe('1080p')
    expect(
      normalizeAppSettings({ videoQualityPreference: '' }).media.videoQualityPreference,
    ).toBeNull()
  })

  it('normalizes reading preferences and multi-column widths', () => {
    expect(normalizeAppSettings({ autoLoadLongText: true }).feed.autoLoadLongText).toBe(true)
    expect(normalizeAppSettings({ motionPreference: 'reduced' }).appearance.motionPreference).toBe(
      'reduced',
    )
    expect(
      normalizeAppSettings({ motionPreference: 'unknown' as never }).appearance.motionPreference,
    ).toBe('system')
    expect(normalizeAppSettings({ feedDensity: 'compact' }).feed.feedDensity).toBe('compact')
    expect(normalizeAppSettings({ commentDensity: 'relaxed' }).feed.commentDensity).toBe('relaxed')
    expect(
      normalizeAppSettings({
        weiboCardCollapsedMediaTypes: ['audio', 'image', 'audio', 'unknown'],
      }).feed.weiboCardCollapsedMediaTypes,
    ).toEqual(['image', 'audio'])
    expect(
      normalizeAppSettings({ weiboCardMediaDisplay: 'collapsed' } as never).feed
        .weiboCardCollapsedMediaTypes,
    ).toEqual([])
    expect(
      normalizeAppSettings({ weiboCardMultiMediaLayout: 'horizontal' }).feed
        .weiboCardMultiMediaLayout,
    ).toBe('horizontal')
    expect(
      normalizeAppSettings({ weiboCardMultiMediaLayout: 'masonry' as never }).feed
        .weiboCardMultiMediaLayout,
    ).toBe('grid')
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridLimit: 12 }).feed.weiboCardMultiMediaGridLimit,
    ).toBe(12)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridLimit: 8 as never }).feed
        .weiboCardMultiMediaGridLimit,
    ).toBe(9)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridMaxWidth: 874 }).feed
        .weiboCardMultiMediaGridMaxWidth,
    ).toBe(850)
    expect(
      normalizeAppSettings({ weiboCardSingleImageMaxWidth: 155 }).feed.weiboCardSingleImageMaxWidth,
    ).toBe(160)
    expect(
      normalizeAppSettings({ weiboCardSingleImageMaxWidth: 456 }).feed.weiboCardSingleImageMaxWidth,
    ).toBe(460)
    expect(
      normalizeAppSettings({ weiboCardSingleVideoMaxWidth: 1400 }).feed
        .weiboCardSingleVideoMaxWidth,
    ).toBe(1200)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaGridMaxWidth: 1000 }).feed
        .weiboCardMultiMediaGridMaxWidth,
    ).toBe(900)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaStripHeight: 391 }).feed
        .weiboCardMultiMediaStripHeight,
    ).toBe(400)
    expect(
      normalizeAppSettings({ weiboCardMultiMediaStripHeight: 100 }).feed
        .weiboCardMultiMediaStripHeight,
    ).toBe(200)
    expect(
      normalizeAppSettings({ commentCardImageDisplay: 'invalid' as never }).feed
        .commentCardImageDisplay,
    ).toBe('expanded')
    expect(normalizeAppSettings({ weiboCardShowAvatar: false }).feed.weiboCardShowAvatar).toBe(
      false,
    )
    expect(
      normalizeAppSettings({ commentCardShowPublishInfo: true }).feed.commentCardShowPublishInfo,
    ).toBe(true)
    expect(normalizeAppSettings({ columnWidth: 'narrower' }).navigation.columnWidth).toBe(
      'narrower',
    )
    expect(normalizeAppSettings({ columnWidth: 'narrow' }).navigation.columnWidth).toBe('narrow')
    expect(normalizeAppSettings({ columnWidth: 'custom' }).navigation.columnWidth).toBe('custom')
    expect(normalizeAppSettings({ columnWidth: 'wider' }).navigation.columnWidth).toBe('wider')
    expect(normalizeAppSettings({ columnWidth: 'custom' }).navigation.columnWidth).toBe('custom')
    expect(normalizeAppSettings({ columnWidth: 'huge' as never }).navigation.columnWidth).toBe(
      'standard',
    )
    expect(normalizeAppSettings({ customColumnWidth: 301 }).navigation.customColumnWidth).toBe(301)
    expect(normalizeAppSettings({ customColumnWidth: 311.4 }).navigation.customColumnWidth).toBe(
      311,
    )
    expect(normalizeAppSettings({ customColumnWidth: 720 }).navigation.customColumnWidth).toBe(720)
    expect(normalizeAppSettings({ customColumnWidth: 1600 }).navigation.customColumnWidth).toBe(
      1600,
    )
    expect(normalizeAppSettings({ customColumnWidth: 0 }).navigation.customColumnWidth).toBe(300)
    expect(
      normalizeAppSettings({ customColumnWidth: 'wide' as never }).navigation.customColumnWidth,
    ).toBe(480)
    const normalized = normalizeAppSettings({
      contentWidth: 'wide',
      customContentWidth: 1600,
      showRightRail: false,
      showHotSearchCard: false,
      showFollowedSuperTopicsCard: true,
      immersiveMode: true,
    } as never)
    expect(normalized).not.toHaveProperty('contentWidth')
    expect(normalized).not.toHaveProperty('customContentWidth')
    expect(normalized).not.toHaveProperty('showRightRail')
    expect(normalized).not.toHaveProperty('showHotSearchCard')
    expect(normalized).not.toHaveProperty('showFollowedSuperTopicsCard')
    expect(normalized).not.toHaveProperty('immersiveMode')
  })
})
