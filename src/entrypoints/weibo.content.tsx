import '../assets/global.css'
import { createRoot, type Root } from 'react-dom/client'

import { setUiPortalContainer } from '@/components/ui/portal'
import { AppRoot } from '@/features/weibo/app/app-root'
import { waitForWeiboHostRegions } from '@/features/weibo/content/host-selectors'
import { markWeiboPageReady } from '@/features/weibo/content/page-takeover'
import { bindShellState } from '@/features/weibo/content/shell-state'
import { getAppSettingsStore } from '@/lib/app-settings-store'

import sonnerStyles from 'sonner/dist/styles.css?raw'

interface MountedWeiboUi {
  root: Root
  cleanup: () => void
}

export let ui: ShadowRootContentScriptUi<MountedWeiboUi>

function injectSonnerStyles(shadow: ShadowRoot) {
  const existingStyle = shadow.querySelector('[data-sonner-styles]')
  if (existingStyle) return

  const style = document.createElement('style')
  style.setAttribute('data-sonner-styles', '')
  style.textContent = sonnerStyles
  shadow.appendChild(style)
}

export default defineContentScript({
  matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await injectScript('/weibo-main-world.js', { keepInDom: true })

    const regions = await waitForWeiboHostRegions(document)
    if (!regions) {
      markWeiboPageReady()
      return
    }
    const settingsStore = getAppSettingsStore()
    await settingsStore.getState().hydrate()

    ui = await createShadowRootUi(ctx, {
      name: 'xb-shell',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount(container, shadow) {
        injectSonnerStyles(shadow)
        setUiPortalContainer(container)
        const cleanup = bindShellState({
          container: container as unknown as HTMLElement,
          appRoot: regions.appRoot,
          settingsStore,
        })
        const root = createRoot(container)
        root.render(<AppRoot />)
        return { cleanup, root }
      },
      onRemove(mounted?: MountedWeiboUi) {
        setUiPortalContainer(null)
        mounted?.cleanup()
        mounted?.root.unmount()
      },
    })

    ui.mount()
  },
})
