import { useSyncExternalStore } from 'react'

import { AppShell } from '@/features/weibo/app/app-shell'
import type { PageStore } from '@/features/weibo/app/page-store'
import type { RewriteSettingsStore } from '@/features/weibo/settings/rewrite-settings'

export function AppRoot({
  pageStore,
  settingsStore,
}: {
  pageStore: PageStore
  settingsStore: RewriteSettingsStore
}) {
  const page = useSyncExternalStore(pageStore.subscribe, pageStore.getSnapshot)
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)

  return (
    <AppShell
      page={page}
      settings={settings}
      onRewriteEnabledChange={(enabled) => settingsStore.update({ enabled })}
      onThemeChange={(theme) => settingsStore.update({ theme })}
    />
  )
}
