// import '@/features/weibo/content/weibo-search-overrides.css'
import { markWeiboPageReady } from '@/features/weibo/content/page-takeover'
import { resolveIsDarkMode } from '@/lib/app-settings'
import { getAppSettingsStore } from '@/lib/app-settings-store'

/**
 * Runs at document_idle on s.weibo.com pages (SSR — no React injection).
 * Applies CSS overrides to rebrand the feed list to match the FeedCard style,
 * and reacts to theme / rewriteEnabled settings stored in chrome.storage.
 */
export default defineContentScript({
  // matches: ['https://s.weibo.com/weibo?q=*'],
  matches: ['<none>'],
  runAt: 'document_idle',
  async main() {
    const settingsStore = getAppSettingsStore()
    await settingsStore.getState().hydrate()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyState = () => {
      const settings = settingsStore.getState()
      const isDark = resolveIsDarkMode(settings.theme, mediaQuery.matches)

      if (settings.rewriteEnabled) {
        document.documentElement.classList.toggle('dark', isDark)
        markWeiboPageReady()
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    const unsubscribe = settingsStore.subscribe(applyState)
    mediaQuery.addEventListener('change', applyState)

    applyState()

    // Cleanup when navigating away
    window.addEventListener('unload', () => {
      unsubscribe()
      mediaQuery.removeEventListener('change', applyState)
      document.documentElement.classList.remove('dark')
    })
  },
})
