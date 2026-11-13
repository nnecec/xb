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

  it('normalizes the merged reply-chain display setting and omits deleted settings', () => {
    expect(normalizeAppSettings({ replyChainDisplay: 'plain' }).replyChainDisplay).toBe('plain')
    expect(normalizeAppSettings({ replyChainDisplay: 'collapsed' }).replyChainDisplay).toBe(
      'collapsed',
    )
    expect(normalizeAppSettings({ replyChainDisplay: 'unknown' as never }).replyChainDisplay).toBe(
      'expanded',
    )

    const normalized = normalizeAppSettings({
      renderReplyChainEnabled: false,
      collapseRepliesEnabled: true,
      forceRedirectToFollowing: true,
      imageGenEnabled: true,
    })
    expect(normalized.replyChainDisplay).toBe('expanded')
    expect(normalized).not.toHaveProperty('renderReplyChainEnabled')
    expect(normalized).not.toHaveProperty('collapseRepliesEnabled')
    expect(normalized).not.toHaveProperty('forceRedirectToFollowing')
    expect(normalized).not.toHaveProperty('imageGenEnabled')
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
      ...DEFAULT_APP_SETTINGS,
      theme: 'dark',
      rewriteEnabled: false,
      uiFontSize: 14,
      contentFontSize: 14,
      fontFamilyClass: 'font-serif',
    })

    const nextSettings = {
      ...DEFAULT_APP_SETTINGS,
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
    }

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
    expect(normalizeAppSettings({ videoQualityPreference: ' 1080P ' }).videoQualityPreference).toBe(
      '1080p',
    )
    expect(normalizeAppSettings({ videoQualityPreference: '' }).videoQualityPreference).toBeNull()
  })

  it('normalizes reading preferences and multi-column widths', () => {
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
    expect(normalizeAppSettings({ columnWidth: 'narrower' }).columnWidth).toBe('narrower')
    expect(normalizeAppSettings({ columnWidth: 'narrow' }).columnWidth).toBe('narrow')
    expect(normalizeAppSettings({ columnWidth: 'custom' }).columnWidth).toBe('custom')
    expect(normalizeAppSettings({ columnWidth: 'wider' }).columnWidth).toBe('wider')
    expect(normalizeAppSettings({ columnWidth: 'custom' }).columnWidth).toBe('custom')
    expect(normalizeAppSettings({ columnWidth: 'huge' as never }).columnWidth).toBe('standard')
    expect(normalizeAppSettings({ customColumnWidth: 301 }).customColumnWidth).toBe(300)
    expect(normalizeAppSettings({ customColumnWidth: 311 }).customColumnWidth).toBe(320)
    expect(normalizeAppSettings({ customColumnWidth: 720 }).customColumnWidth).toBe(720)
    expect(normalizeAppSettings({ customColumnWidth: 800 }).customColumnWidth).toBe(720)
    expect(normalizeAppSettings({ customColumnWidth: 0 }).customColumnWidth).toBe(300)
    expect(normalizeAppSettings({ customColumnWidth: 'wide' as never }).customColumnWidth).toBe(480)
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
