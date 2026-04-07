import { createRouteStore } from '@/features/weibo/route/router-sync'

export function createPageStore(initialHref: string = window.location.href) {
  return createRouteStore(initialHref)
}

export type PageStore = ReturnType<typeof createPageStore>
