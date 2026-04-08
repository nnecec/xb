export interface WeiboHostRegions {
  appRoot: HTMLElement
}

const APP_ROOT_SELECTORS = [
  '#app',
]

const CONTENT_SELECTORS = [
  '[data-testid="mainCore"]',
  'main',
  '#app > div',
]

export function waitForWeiboHostRegions(
  doc: Document,
  timeoutMs = 12_000,
): Promise<WeiboHostRegions | null> {
  const immediate = findWeiboHostRegions(doc)
  if (immediate) {
    return Promise.resolve(immediate)
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (regions: WeiboHostRegions | null) => {
      if (settled) return
      settled = true
      observer.disconnect()
      window.clearTimeout(timerId)
      resolve(regions)
    }

    const observer = new MutationObserver(() => {
      const next = findWeiboHostRegions(doc)
      if (next) {
        finish(next)
      }
    })

    observer.observe(doc.documentElement, { childList: true, subtree: true })

    const timerId = window.setTimeout(() => {
      finish(findWeiboHostRegions(doc))
    }, timeoutMs)
  })
}

export function findWeiboHostRegions(root: ParentNode): WeiboHostRegions | null {
  for (const selector of APP_ROOT_SELECTORS) {
    const appRoot = root.querySelector<HTMLElement>(selector)

    if (appRoot) {
      return { appRoot }
    }
  }

  for (const selector of CONTENT_SELECTORS) {
    const contentRoot = root.querySelector<HTMLElement>(selector)

    if (contentRoot) {
      const appRoot = contentRoot.closest<HTMLElement>('#app') ?? contentRoot.parentElement

      if (appRoot instanceof HTMLElement) {
        return { appRoot }
      }
    }
  }

  return null
}
