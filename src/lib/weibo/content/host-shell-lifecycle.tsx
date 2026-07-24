import { createRoot, type Root } from 'react-dom/client'

import { setUiPortalContainer } from '@/components/ui/portal'
import type { HomeTab } from '@/lib/app-settings'
import { getAppSettingsStore } from '@/lib/app-settings-store'
import { AppRoot } from '@/lib/weibo/app/app-root'
import { waitForWeiboHostRegions } from '@/lib/weibo/content/host-selectors'
import { markWeiboPageReady } from '@/lib/weibo/content/page-takeover'
import { bindShellState } from '@/lib/weibo/content/shell-state'
import { loadFollowGroups } from '@/lib/weibo/data/weibo-data'
import { homeTimelinePathFromTab } from '@/lib/weibo/route/home-timeline-path'

interface MountedWeiboUi {
  root: Root
  cleanup: () => void
}

export function injectSonnerStyles(shadow: ShadowRoot, styles: string) {
  const existingStyle = shadow.querySelector('[data-sonner-styles]')
  if (existingStyle) return

  const style = document.createElement('style')
  style.setAttribute('data-sonner-styles', '')
  style.textContent = styles
  shadow.appendChild(style)
}

export function shouldRedirectInitialHomePage({
  firstLoadRedirect,
  historyLength,
  pathname,
}: {
  firstLoadRedirect: HomeTab
  historyLength: number
  pathname: string
}) {
  return (
    firstLoadRedirect !== 'for-you' && historyLength <= 2 && (pathname === '/' || pathname === '')
  )
}

export async function mountWeiboHostShell({
  ctx,
  sonnerStyles,
}: {
  ctx: Parameters<typeof createShadowRootUi>[0]
  sonnerStyles: string
}): Promise<ShadowRootContentScriptUi<MountedWeiboUi> | null> {
  await injectScript('/weibo-main-world.js', { keepInDom: true })

  const regions = await waitForWeiboHostRegions(document)
  if (!regions) {
    markWeiboPageReady()
    return null
  }

  const settingsStore = getAppSettingsStore()
  await settingsStore.getState().hydrate()

  // 首次加载跳转：当 window.history.length <= 2 且当前在首页时，重定向到用户选择的页面
  const { firstLoadRedirect } = settingsStore.getState()
  if (
    shouldRedirectInitialHomePage({
      firstLoadRedirect,
      historyLength: window.history.length,
      pathname: window.location.pathname,
    })
  ) {
    let redirectPath = homeTimelinePathFromTab(firstLoadRedirect)
    if (firstLoadRedirect === 'special-follow' || firstLoadRedirect === 'friend-circle') {
      try {
        const groups = await loadFollowGroups()
        redirectPath = homeTimelinePathFromTab(firstLoadRedirect, groups.defaultGroups)
      } catch {
        redirectPath = homeTimelinePathFromTab(firstLoadRedirect)
      }
    }
    window.location.replace(redirectPath)
    return null
  }

  const ui = await createShadowRootUi(ctx, {
    name: 'xb-shell',
    position: 'inline',
    anchor: 'body',
    append: 'first',
    onMount(container, shadow) {
      injectSonnerStyles(shadow, sonnerStyles)
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
  return ui
}
