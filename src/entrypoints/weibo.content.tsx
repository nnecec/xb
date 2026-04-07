import '../assets/global.css'

import { createRoot, type Root } from 'react-dom/client'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { defineContentScript } from 'wxt/utils/define-content-script'
import { injectScript } from 'wxt/utils/inject-script'

import { AppRoot } from '@/features/weibo/app/app-root'
import { createPageStore, type PageStore } from '@/features/weibo/app/page-store'
import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'
import { applyPageTakeover, clearPageTakeover } from '@/features/weibo/content/page-takeover'
import {
  createRewriteSettingsStore,
  loadRewriteSettings,
  resolveIsDarkMode,
  type RewriteSettingsStore,
} from '@/features/weibo/settings/rewrite-settings'

interface MountedWeiboUi {
  pageStore: PageStore
  settingsStore: RewriteSettingsStore
  root: Root
  cleanup: () => void
}

function bindShellState({
  container,
  contentRoot,
  settingsStore,
}: {
  container: HTMLElement
  contentRoot: HTMLElement
  settingsStore: RewriteSettingsStore
}) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyShellState = () => {
    const settings = settingsStore.getSnapshot()
    const isDark = resolveIsDarkMode(settings.theme, mediaQuery.matches)

    container.classList.toggle('dark', isDark)

    if (settings.enabled) {
      applyPageTakeover(contentRoot)
      return
    }

    clearPageTakeover(contentRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  applyShellState()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    clearPageTakeover(contentRoot)
  }
}

export default defineContentScript({
  matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await injectScript('/weibo-main-world.js', { keepInDom: true })

    const regions = findWeiboHostRegions(document)
    if (!regions) {
      return
    }
    const initialSettings = await loadRewriteSettings()

    const ui = await createShadowRootUi(ctx, {
      name: 'loveforxb-shell',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount(container) {
        const pageStore = createPageStore()
        const settingsStore = createRewriteSettingsStore(initialSettings)
        const cleanup = bindShellState({
          container,
          contentRoot: regions.contentRoot,
          settingsStore,
        })
        const root = createRoot(container)
        root.render(<AppRoot pageStore={pageStore} settingsStore={settingsStore} />)
        return { cleanup, pageStore, settingsStore, root }
      },
      onRemove(mounted?: MountedWeiboUi) {
        mounted?.cleanup()
        mounted?.settingsStore.dispose()
        mounted?.pageStore.dispose()
        mounted?.root.unmount()
      },
    })

    ui.mount()
  },
})
