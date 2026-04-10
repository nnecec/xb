import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

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
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
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

  if (!rewriteEnabled) {
    return <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />
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
          onCommentClick={navigateToStatusDetail}
          onHomeRetry={() => void timelineQuery.refetch()}
          onHomeTabChange={(tab) => navigate(getHomeTimelinePath(tab))}
          onLoadNextComments={() => void statusCommentsQuery.fetchNextPage()}
          onLoadNextTimeline={() => void timelineQuery.fetchNextPage()}
        />
      </ShellFrame>
    )
  }

  if (page.kind === 'profile') {
    return (
      <ShellFrame {...shellFrameProps}>
        <ProfilePanel
          errorMessage={profileErrorMessage}
          isLoading={isProfileLoading}
          posts={profilePostsQuery.data}
          profile={profileInfoQuery.data}
          onCommentClick={navigateToStatusDetail}
        />
      </ShellFrame>
    )
  }

  return (
    <ShellFrame {...shellFrameProps}>
      <div className="h-full overflow-y-auto">
        <UnsupportedPageCard page={page} />
      </div>
    </ShellFrame>
  )
}
