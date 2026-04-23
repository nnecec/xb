import { isRouteChangeMessage } from '@/lib/weibo/platform/messages'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'

export interface RouteStore {
  getSnapshot: () => WeiboPageDescriptor
  subscribe: (listener: () => void) => () => void
  dispose: () => void
}

export function createRouteStore(initialHref: string): RouteStore {
  let snapshot = parseWeiboUrl(initialHref)
  const listeners = new Set<() => void>()

  const onMessage = (event: MessageEvent) => {
    if (!isRouteChangeMessage(event.data)) {
      return
    }

    snapshot = parseWeiboUrl(event.data.href)
    listeners.forEach((listener) => listener())
  }

  window.addEventListener('message', onMessage)

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      window.removeEventListener('message', onMessage)
      listeners.clear()
    },
  }
}
