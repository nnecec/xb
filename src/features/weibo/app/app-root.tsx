import { useSyncExternalStore } from 'react'

import { AppShell } from '@/features/weibo/app/app-shell'
import type { PageStore } from '@/features/weibo/app/page-store'

export function AppRoot({
  pageStore,
}: {
  pageStore: PageStore
}) {
  const page = useSyncExternalStore(pageStore.subscribe, pageStore.getSnapshot)

  return <AppShell page={page} />
}
