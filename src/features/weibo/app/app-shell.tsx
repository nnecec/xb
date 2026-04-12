import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { RewritePausedCard, ShellFrame } from '@/features/weibo/app/app-shell-layout'
import { CommentModal } from '@/features/weibo/components/comment-modal'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { StatusDetailNavigationItem } from '@/features/weibo/models/feed'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { submitComposeAction } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

function getHomeTimelinePath(tab: 'for-you' | 'following') {
  return tab === 'following' ? '/mygroups' : '/'
}

function usePage() {
  const location = useLocation()
  return parseWeiboUrl(
    new URL(`${location.pathname}${location.search}`, window.location.origin).href,
  )
}

export interface AppShellContext {
  page: ReturnType<typeof usePage>
  navigateToStatusDetail: (item: StatusDetailNavigationItem) => void
  composeTarget: ComposeTarget | null
  setComposeTarget: (target: ComposeTarget | null) => void
  isComposeSubmitting: boolean
  handleComposeSubmit: (payload: { text: string; alsoSecondaryAction: boolean }) => Promise<void>
  viewingProfileUserId: string | null
  onProfileUserIdChange: (userId: string | null) => void
  onHomeTabChange: (tab: 'for-you' | 'following') => void
  refreshTimeline: () => void
}

export function AppShell() {
  const navigate = useNavigate()
  const page = usePage()
  const queryClient = useQueryClient()

  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setTheme = useAppSettings((state) => state.setTheme)
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
  const [isComposeSubmitting, setIsComposeSubmitting] = useState(false)
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null)

  const composeMutation = useMutation({
    mutationFn: submitComposeAction,
    meta: {
      invalidates: [['weibo']],
    },
  })

  const navigateToStatusDetail = (item: StatusDetailNavigationItem) => {
    const statusId = item.mblogId ?? item.id
    if (!item.author.id || !statusId) {
      return
    }
    navigate(`/${item.author.id}/${statusId}`)
  }

  async function handleComposeSubmit(payload: { text: string; alsoSecondaryAction: boolean }) {
    if (!composeTarget) {
      return
    }

    setIsComposeSubmitting(true)

    try {
      await composeMutation.mutateAsync({
        target: composeTarget,
        text: payload.text,
        alsoSecondaryAction: payload.alsoSecondaryAction,
      })

      toast.success(composeTarget.mode === 'repost' ? '转发成功' : '回复成功')
      setComposeTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
    } finally {
      setIsComposeSubmitting(false)
    }
  }

  const refreshTimeline = () => {
    void queryClient.invalidateQueries({ queryKey: ['weibo', 'timeline'] })
  }

  const context: AppShellContext = {
    page,
    navigateToStatusDetail,
    composeTarget,
    setComposeTarget,
    isComposeSubmitting,
    handleComposeSubmit,
    viewingProfileUserId,
    onProfileUserIdChange: setViewingProfileUserId,
    onHomeTabChange: (tab) => navigate(getHomeTimelinePath(tab)),
    refreshTimeline,
  }

  const composeModal = (
    <CommentModal
      open={composeTarget !== null}
      target={composeTarget}
      isSubmitting={isComposeSubmitting}
      onOpenChange={(open) => {
        if (!open) {
          setComposeTarget(null)
        }
      }}
      onSubmit={handleComposeSubmit}
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
