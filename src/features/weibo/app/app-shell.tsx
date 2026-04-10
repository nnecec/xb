import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  RewritePausedCard,
  ShellFrame,
  UnsupportedPageCard,
} from '@/features/weibo/app/app-shell-layout'
import { HomeStatusPanels, ProfilePanel } from '@/features/weibo/app/app-shell-panels'
import {
  type StatusDetailNavigationItem,
  useHomeTimelineData,
  useProfilePageData,
  useStatusPageData,
} from '@/features/weibo/app/app-shell-queries'
import { CommentModal } from '@/features/weibo/components/comment-modal'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { submitComposeAction } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

function getHomeTimelinePath(tab: 'for-you' | 'following') {
  return tab === 'following' ? '/mygroups' : '/'
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = useMemo(
    () =>
      parseWeiboUrl(new URL(`${location.pathname}${location.search}`, window.location.origin).href),
    [location.pathname, location.search],
  )

  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setTheme = useAppSettings((state) => state.setTheme)
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
  const [isComposeSubmitting, setIsComposeSubmitting] = useState(false)
  const activeTimelineTab = page.kind === 'home' ? page.tab : 'for-you'

  const { timelineQuery, items: timelineItems } = useHomeTimelineData({
    activeTimelineTab,
    isEnabled: rewriteEnabled && page.kind === 'home',
  })
  const {
    profileInfoQuery,
    profilePostsQuery,
    isLoading: isProfileLoading,
    errorMessage: profileErrorMessage,
    viewingProfileUserId,
  } = useProfilePageData({
    page,
    isEnabled: rewriteEnabled && page.kind === 'profile',
  })
  const {
    statusDetailQuery,
    statusCommentsQuery,
    comments: statusComments,
  } = useStatusPageData({
    page,
    isEnabled: rewriteEnabled && page.kind === 'status',
  })

  const navigateToStatusDetail = (item: StatusDetailNavigationItem) => {
    const statusId = item.mblogId ?? item.id
    if (!item.author.id || !statusId) {
      return
    }
    navigate(`/${item.author.id}/${statusId}`)
  }

  async function handleComposeSubmit(payload: {
    text: string
    alsoSecondaryAction: boolean
  }) {
    if (!composeTarget) {
      return
    }

    setIsComposeSubmitting(true)

    try {
      await submitComposeAction({
        target: composeTarget,
        text: payload.text,
        alsoSecondaryAction: payload.alsoSecondaryAction,
      })

      if (page.kind === 'status') {
        await Promise.all([statusDetailQuery.refetch(), statusCommentsQuery.refetch()])
      }

      toast.success(composeTarget.mode === 'repost' ? '转发成功' : '回复成功')
      setComposeTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
    } finally {
      setIsComposeSubmitting(false)
    }
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

  const shellFrameProps = {
    pageKind: page.kind,
    viewingProfileUserId,
    rewriteEnabled,
    theme,
    onRewriteEnabledChange: (enabled: boolean) => void setRewriteEnabled(enabled),
    onThemeChange: (nextTheme: typeof theme) => void setTheme(nextTheme),
  }

  if (page.kind === 'home' || page.kind === 'status') {
    return (
      <>
        <ShellFrame {...shellFrameProps}>
          <HomeStatusPanels
            activeTimelineTab={activeTimelineTab}
            isHomePageVisible={page.kind === 'home'}
            isStatusPageVisible={page.kind === 'status'}
            timelineErrorMessage={
              timelineQuery.error instanceof Error ? timelineQuery.error.message : null
            }
            timelineHasNextPage={Boolean(timelineQuery.hasNextPage)}
            timelineIsFetchingNextPage={timelineQuery.isFetchingNextPage}
            timelineIsLoading={timelineQuery.isLoading}
            timelineItems={timelineItems}
            statusComments={statusComments}
            statusCommentsHasNextPage={Boolean(statusCommentsQuery.hasNextPage)}
            statusCommentsIsFetchingNextPage={statusCommentsQuery.isFetchingNextPage}
            statusDetail={statusDetailQuery.data}
            statusDetailErrorMessage={
              statusDetailQuery.error instanceof Error ? statusDetailQuery.error.message : null
            }
            statusDetailIsLoading={statusDetailQuery.isLoading}
            onStatusComment={setComposeTarget}
            onStatusRepost={setComposeTarget}
            onCommentReply={setComposeTarget}
            onCommentClick={navigateToStatusDetail}
            onHomeRetry={() => void timelineQuery.refetch()}
            onHomeTabChange={(tab) => navigate(getHomeTimelinePath(tab))}
            onLoadNextComments={() => void statusCommentsQuery.fetchNextPage()}
            onLoadNextTimeline={() => void timelineQuery.fetchNextPage()}
          />
        </ShellFrame>
        {composeModal}
      </>
    )
  }

  if (page.kind === 'profile') {
    return (
      <>
        <ShellFrame {...shellFrameProps}>
          <ProfilePanel
            errorMessage={profileErrorMessage}
            isLoading={isProfileLoading}
            posts={profilePostsQuery.data}
            profile={profileInfoQuery.data}
            onCommentClick={navigateToStatusDetail}
          />
        </ShellFrame>
        {composeModal}
      </>
    )
  }

  return (
    <>
      <ShellFrame {...shellFrameProps}>
        <div className="h-full overflow-y-auto">
          <UnsupportedPageCard page={page} />
        </div>
      </ShellFrame>
      {composeModal}
    </>
  )
}
