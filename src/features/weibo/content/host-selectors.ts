export interface WeiboHostRegions {
  contentRoot: HTMLElement
}

const CONTENT_SELECTORS = [
  '[data-testid="mainCore"]',
  'main',
  '#app > div',
]

export function findWeiboHostRegions(root: ParentNode): WeiboHostRegions | null {
  for (const selector of CONTENT_SELECTORS) {
    const contentRoot = root.querySelector<HTMLElement>(selector)

    if (contentRoot) {
      return { contentRoot }
    }
  }

  return null
}
