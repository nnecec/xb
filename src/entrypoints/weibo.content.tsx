import '../assets/global.css'

import { createRoot, type Root } from 'react-dom/client'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { defineContentScript } from 'wxt/utils/define-content-script'
import { injectScript } from 'wxt/utils/inject-script'

import { AppRoot } from '@/features/weibo/app/app-root'
import { createPageStore, type PageStore } from '@/features/weibo/app/page-store'
import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'
import { applyPageTakeover } from '@/features/weibo/content/page-takeover'

interface MountedWeiboUi {
  pageStore: PageStore
  root: Root
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

    applyPageTakeover(regions.contentRoot)

    const ui = await createShadowRootUi(ctx, {
      name: 'loveforxb-shell',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount(container) {
        const pageStore = createPageStore()
        const root = createRoot(container)
        root.render(<AppRoot pageStore={pageStore} />)
        return { pageStore, root }
      },
      onRemove(mounted?: MountedWeiboUi) {
        mounted?.pageStore.dispose()
        mounted?.root.unmount()
      },
    })

    ui.mount()
  },
})
