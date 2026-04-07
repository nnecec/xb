import {
  LOVEFORXB_SOURCE,
  ROUTE_CHANGE_EVENT,
} from '@/features/weibo/platform/messages'

type HistoryMethod = 'pushState' | 'replaceState'

export function installHistoryBridge(targetWindow: Window) {
  const emitRouteChange = () => {
    targetWindow.postMessage({
      source: LOVEFORXB_SOURCE,
      type: ROUTE_CHANGE_EVENT,
      href: targetWindow.location.href,
    }, '*')
  }

  const wrapHistoryMethod = (method: HistoryMethod) => {
    const original = targetWindow.history[method]

    Object.defineProperty(targetWindow.history, method, {
      configurable: true,
      writable: true,
      value: function patchedHistoryMethod(this: History, ...args: Parameters<History[HistoryMethod]>) {
        const result = original.apply(this, args)
        emitRouteChange()
        return result
      },
    })
  }

  wrapHistoryMethod('pushState')
  wrapHistoryMethod('replaceState')
  targetWindow.addEventListener('popstate', emitRouteChange)
}
