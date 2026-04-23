const HIDDEN_ATTR = 'data-xb-hidden'
const PREVIOUS_DISPLAY_ATTR = 'data-xb-previous-display'

/** Set on `<html>` once shell state is applied; paired with `weibo-hide.content.css`. */
export const WEIBO_PAGE_READY_ATTR = 'data-xb-weibo-ready'

export function markWeiboPageReady() {
  document.documentElement.setAttribute(WEIBO_PAGE_READY_ATTR, '')
}

export function applyPageTakeover(node: HTMLElement) {
  if (!node.hasAttribute(PREVIOUS_DISPLAY_ATTR)) {
    node.setAttribute(PREVIOUS_DISPLAY_ATTR, node.style.display)
  }

  node.setAttribute(HIDDEN_ATTR, 'true')
  node.setAttribute('aria-hidden', 'true')
  node.style.display = 'none'
}

export function clearPageTakeover(node: HTMLElement) {
  const previousDisplay = node.getAttribute(PREVIOUS_DISPLAY_ATTR) ?? ''

  node.removeAttribute(HIDDEN_ATTR)
  node.removeAttribute(PREVIOUS_DISPLAY_ATTR)
  node.removeAttribute('aria-hidden')
  node.style.display = previousDisplay
}
