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

  it('loads and persists settings through storage', async () => {
    const storage = createStorageArea({
      theme: 'dark',
      rewriteEnabled: false,
      fontSizeClass: 'text-sm',
      fontFamilyClass: 'font-serif',
      showHotSearchCard: false,
    })

    expect(await loadAppSettings(storage)).toEqual({
      contentWidth: 'standard',
      theme: 'dark',
      rewriteEnabled: false,
      fontSizeClass: 'text-sm',
      fontWeightClass: 'font-normal',
      letterSpacingClass: 'tracking-normal',
      lineHeightClass: 'leading-relaxed',
      fontFamilyClass: 'font-serif',
      showHotSearchCard: false,
      collapseRepliesEnabled: false,
      renderReplyChainEnabled: true,
      darkModeImageDim: false,
      lightModeBgColor: 'white',
      darkModeBgColor: 'near-black',
      imageGenEnabled: true,
      imageGenShowDataArea: true,
      imageGenShowFullImages: false,
      imageGenShowWeiboLink: false,
      imageGenTheme: 'light',
      imageGenCardStyle: 'default',
      hotSearchType: 'hot',
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
    })

    await persistAppSettings(
      {
        contentWidth: 'standard',
        theme: 'light',
        rewriteEnabled: true,
        fontSizeClass: 'text-lg',
        fontWeightClass: 'font-medium',
        letterSpacingClass: 'tracking-wide',
        lineHeightClass: 'leading-loose',
        fontFamilyClass: 'font-serif',
        showHotSearchCard: true,
        collapseRepliesEnabled: false,
        renderReplyChainEnabled: true,
        darkModeImageDim: false,
        lightModeBgColor: 'paper',
        darkModeBgColor: 'dark-gray',
        imageGenEnabled: true,
        imageGenShowDataArea: true,
        imageGenShowFullImages: false,
        imageGenShowWeiboLink: false,
        imageGenTheme: 'light',
        imageGenCardStyle: 'default',
        hotSearchType: 'mine',
        statusDetailPopupEnabled: false,
        statusDetailPopupPosition: 'right',
        statusDetailPopupWidth: 60,
        backgroundEnabled: true,
        backgroundColor: '#1e40af',
        backgroundImageUrl: 'https://bing.img.run/1920x1080.php',
        glassOpacity: 80,
        glassBlur: 12,
        xLayoutEnabled: true,
        waterfallColumnCount: 1,
        browsingHistoryEnabled: true,
        followGroupsEnabled: false,
        xbTopicPage: true,
      },
      storage,
    )

    expect(storage.read()).toEqual({
      contentWidth: 'standard',
      theme: 'light',
      rewriteEnabled: true,
      fontSizeClass: 'text-lg',
      fontWeightClass: 'font-medium',
      letterSpacingClass: 'tracking-wide',
      lineHeightClass: 'leading-loose',
      fontFamilyClass: 'font-serif',
      showHotSearchCard: true,
      collapseRepliesEnabled: false,
      renderReplyChainEnabled: true,
      darkModeImageDim: false,
      lightModeBgColor: 'paper',
      darkModeBgColor: 'dark-gray',
      imageGenEnabled: true,
      imageGenShowDataArea: true,
      imageGenShowFullImages: false,
      imageGenShowWeiboLink: false,
      imageGenTheme: 'light',
      imageGenCardStyle: 'default',
      hotSearchType: 'mine',
      statusDetailPopupEnabled: false,
      statusDetailPopupPosition: 'right',
      statusDetailPopupWidth: 60,
      backgroundEnabled: true,
      backgroundColor: '#1e40af',
      backgroundImageUrl: 'https://bing.img.run/1920x1080.php',
      glassOpacity: 80,
      glassBlur: 12,
      xLayoutEnabled: true,
      waterfallColumnCount: 1,
      browsingHistoryEnabled: true,
      followGroupsEnabled: false,
      xbTopicPage: true,
    })
  })

  it('resolves dark mode from theme preference', () => {
    expect(resolveIsDarkMode('dark', false)).toBe(true)
    expect(resolveIsDarkMode('light', true)).toBe(false)
    expect(resolveIsDarkMode('system', true)).toBe(true)
    expect(resolveIsDarkMode('system', false)).toBe(false)
  })
})
