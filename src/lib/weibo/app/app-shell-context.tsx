import { createContext, type ReactNode, useContext } from 'react'

import type { HomeTab } from '@/lib/app-settings'
import type { ComposeTarget } from '@/lib/weibo/models/compose'

export interface AppShellContextValue {
  composeTarget: ComposeTarget | null
  setComposeTarget: (target: ComposeTarget | null) => void
  viewingProfileUserId: string | null
  onProfileUserIdChange: (userId: string | null) => void
  onHomeTabChange: (tab: HomeTab) => void
  refreshTimeline: () => void
  onFollowGroupChange: (gid: string | null) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function AppShellContextProvider({
  children,
  value,
}: {
  children: ReactNode
  value: AppShellContextValue
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}

export function useAppShellContext(): AppShellContextValue {
  const context = useContext(AppShellContext)
  if (!context) {
    throw new Error('应用内容必须位于 AppShellContextProvider 内')
  }
  return context
}
