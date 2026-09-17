const COLUMN_SELECTOR = '[data-primary-column], [data-auxiliary-column]'

function eventTargetElement(event: WheelEvent): Element | null {
  const target = event.target
  if (target instanceof Element) return target
  if (target instanceof Node) return target.parentElement
  return null
}

function isVerticalWheel(event: WheelEvent): boolean {
  if (event.ctrlKey || event.shiftKey) return false
  return event.deltaY !== 0 && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
}

function hasVerticalOverflow(element: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(element)
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false
  return element.scrollHeight - element.clientHeight > 1
}

function wheelDeltaY(event: WheelEvent, scroller: HTMLElement): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * scroller.clientHeight
  return event.deltaY
}

export function forwardBlankAreaWheelToMainColumn(
  event: WheelEvent,
  boundary: HTMLElement,
  mainColumn: HTMLElement | null,
): void {
  if (!mainColumn || event.defaultPrevented || !isVerticalWheel(event)) return
  const target = eventTargetElement(event)
  if (!target || !boundary.contains(target) || target.closest(COLUMN_SELECTOR)) return

  let node: Element | null = target
  while (node && node !== boundary) {
    if (node instanceof HTMLElement && hasVerticalOverflow(node)) return
    node = node.parentElement
  }

  const maxScrollTop = mainColumn.scrollHeight - mainColumn.clientHeight
  if (maxScrollTop <= 1) return
  const delta = wheelDeltaY(event, mainColumn)
  if (delta === 0) return
  event.preventDefault()
  const nextScrollTop = Math.min(maxScrollTop, Math.max(0, mainColumn.scrollTop + delta))
  if (nextScrollTop !== mainColumn.scrollTop) mainColumn.scrollTop = nextScrollTop
}
