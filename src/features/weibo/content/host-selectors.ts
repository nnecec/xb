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
