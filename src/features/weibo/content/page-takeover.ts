const HIDDEN_ATTR = 'data-loveforxb-hidden'
const PREVIOUS_DISPLAY_ATTR = 'data-loveforxb-previous-display'

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
