import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { RewritePausedCard, ShellFrame } from '@/features/weibo/app/app-shell-layout'
import { CommentModal } from '@/features/weibo/components/comment-modal'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { StatusDetailNavigationItem } from '@/features/weibo/models/feed'
import { useWeiboPage } from '@/features/weibo/route/use-weibo-page'
import { useAppSettings } from '@/lib/app-settings-store'

function getHomeTimelinePath(tab: 'for-you' | 'following') {
  return tab === 'following' ? '/mygroups' : '/'
}

export interface AppShellContext {
  page: ReturnType<typeof useWeiboPage>
  navigateToStatusDetail: (item: StatusDetailNavigationItem) => void
  composeTarget: ComposeTarget | null
  setComposeTarget: (target: ComposeTarget | null) => void
  viewingProfileUserId: string | null
  onProfileUserIdChange: (userId: string | null) => void
  onHomeTabChange: (tab: 'for-you' | 'following') => void
  refreshTimeline: () => void
}

export function AppShell() {
  const navigate = useNavigate()
  const page = useWeiboPage()
  const queryClient = useQueryClient()

  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setTheme = useAppSettings((state) => state.setTheme)
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null)

  const navigateToStatusDetail = (item: StatusDetailNavigationItem) => {
    const statusId = item.mblogId ?? item.id
    if (!item.author.id || !statusId) {
      return
    }
    navigate(`/${item.author.id}/${statusId}`)
  }

  const refreshTimeline = () => {
    void queryClient.invalidateQueries({ queryKey: ['weibo', 'timeline'] })
  }

  const context: AppShellContext = {
    page,
    navigateToStatusDetail,
    composeTarget,
    setComposeTarget,
    viewingProfileUserId,
    onProfileUserIdChange: setViewingProfileUserId,
    onHomeTabChange: (tab) => navigate(getHomeTimelinePath(tab)),
    refreshTimeline,
  }

  const composeModal = (
    <CommentModal
      open={composeTarget !== null}
      target={composeTarget}
      onOpenChange={(open) => {
        if (!open) {
          setComposeTarget(null)
        }
      }}
    />
  )

  if (!rewriteEnabled) {
    return (
      <>
        <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />
        {composeModal}
      </>
    )
  }

  return (
    <ShellFrame
      pageKind={page.kind}
      viewingProfileUserId={viewingProfileUserId}
      rewriteEnabled={rewriteEnabled}
      theme={theme}
      onRewriteEnabledChange={(enabled: boolean) => void setRewriteEnabled(enabled)}
      onThemeChange={(nextTheme: typeof theme) => void setTheme(nextTheme)}
      onRefresh={refreshTimeline}
    >
      <Outlet context={context} />
      {composeModal}
    </ShellFrame>
  )
}
