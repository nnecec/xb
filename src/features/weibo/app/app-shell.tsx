import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { RightRail } from '@/features/weibo/components/right-rail'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import {
  loadHomeTimeline,
  loadProfileHoverCard,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
} from '@/features/weibo/services/weibo-repository'
import type { AppTheme } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'

const PAGE_LABELS: Record<WeiboPageDescriptor['kind'], string> = {
  home: 'Home',
  profile: 'Profile',
  status: 'Status Detail',
  unsupported: 'Unsupported Page',
}

function describePage(page: WeiboPageDescriptor): string {
  switch (page.kind) {
    case 'home':
      return `Active tab: ${page.tab}`
    case 'profile':
      return `Profile ${page.profileId} via /${page.profileSource}`
    case 'status':
      return `Status ${page.statusId} by ${page.authorId}`
    case 'unsupported':
      return `Reason: ${page.reason}`
  }
}

function ShellFrame({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid h-full w-full grid-cols-[72px_minmax(0,1fr)] gap-3 px-3 py-3 md:grid-cols-[88px_minmax(0,1fr)] md:gap-4 md:px-4 md:py-4 lg:grid-cols-[88px_minmax(360px,1fr)_240px] xl:grid-cols-[280px_minmax(360px,600px)_280px] xl:max-w-[1200px]">
        <div className="contents">
          <div className="hidden xl:block">
            <NavigationRail
              pageKind={pageKind}
              viewingProfileUserId={viewingProfileUserId}
              rewriteEnabled={rewriteEnabled}
              theme={theme}
              onRewriteEnabledChange={onRewriteEnabledChange}
              onThemeChange={onThemeChange}
            />
          </div>
          <div className="xl:hidden">
            <NavigationRail
              pageKind={pageKind}
              viewingProfileUserId={viewingProfileUserId}
              rewriteEnabled={rewriteEnabled}
              theme={theme}
              onRewriteEnabledChange={onRewriteEnabledChange}
              onThemeChange={onThemeChange}
              logoOnly
            />
          </div>
          <main className="min-w-0 overflow-hidden">{children}</main>
          <div className="hidden lg:flex">
            <RightRail />
          </div>
        </div>
      </div>
    </div>
  )
}

function RewritePausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 z-2147483647">
      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-lg shadow-black/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            LoveForXb
          </CardTitle>
          <CardDescription>一键切换「更清爽、更 X 的」超级体验</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume} className="justify-between">
            <span>Let's LoveForXb</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const homeScrollRef = useRef<HTMLDivElement | null>(null)
  const page = useMemo(
    () =>
      parseWeiboUrl(new URL(`${location.pathname}${location.search}`, window.location.origin).href),
    [location.pathname, location.search],
  )

  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const activeTimelineTab = useAppSettings((state) => state.homeTimelineTab)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setHomeTimelineTab = useAppSettings((state) => state.setHomeTimelineTab)
  const setTheme = useAppSettings((state) => state.setTheme)

  const timelineQuery = useInfiniteQuery({
    queryKey: ['weibo', 'timeline', activeTimelineTab],
    queryFn: ({ pageParam }) => loadHomeTimeline(activeTimelineTab, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
    enabled: rewriteEnabled && page.kind === 'home',
  })

  const profileInfoQuery = useQuery({
    queryKey: [
      'weibo',
      'profile',
      'info',
      page.kind === 'profile' ? page.profileSource : null,
      page.kind === 'profile' ? page.profileId : null,
    ],
    queryFn: () => {
      if (page.kind !== 'profile') {
        return Promise.reject(new Error('not-profile'))
      }
      return page.profileSource === 'u'
        ? loadProfileHoverCard({ uid: page.profileId })
        : loadProfileHoverCard({ screenName: page.profileId })
    },
    enabled: rewriteEnabled && page.kind === 'profile',
  })
  const profilePostsQuery = useQuery({
    queryKey: ['weibo', 'profile', 'posts', profileInfoQuery.data?.id ?? null],
    queryFn: () => loadProfilePosts(profileInfoQuery.data!.id),
    enabled: rewriteEnabled && page.kind === 'profile' && Boolean(profileInfoQuery.data?.id),
  })

  const statusDetailQuery = useQuery({
    queryKey: ['weibo', 'status', page.kind === 'status' ? page.statusId : null],
    queryFn: () => loadStatusDetail(page.kind === 'status' ? page.statusId : ''),
    enabled: rewriteEnabled && page.kind === 'status',
  })
  const statusCommentsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'status-comments', page.kind === 'status' ? page.statusId : null],
    queryFn: ({ pageParam }) =>
      loadStatusComments(page.kind === 'status' ? page.statusId : '', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: rewriteEnabled && page.kind === 'status',
  })

  const timelineItems = useMemo(
    () => timelineQuery.data?.pages.flatMap((timelinePage) => timelinePage.items) ?? [],
    [timelineQuery.data],
  )
  const statusComments = useMemo(
    () => statusCommentsQuery.data?.pages.flatMap((commentsPage) => commentsPage.items) ?? [],
    [statusCommentsQuery.data],
  )
  const navigateToStatusDetail = (item: {
    author: { id: string }
    id: string
    mblogId: string | null
  }) => {
    const statusId = item.mblogId ?? item.id
    if (!item.author.id || !statusId) {
      return
    }
    navigate(`/${item.author.id}/${statusId}`)
  }

  const viewingProfileUserId = useMemo(
    () => (page.kind === 'profile' ? profileInfoQuery.data?.id ?? null : null),
    [page.kind, profileInfoQuery.data?.id],
  )

  if (!rewriteEnabled) {
    return <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />
  }

  if (page.kind === 'home' || page.kind === 'status') {
    return (
      <ShellFrame
        pageKind={page.kind}
        viewingProfileUserId={viewingProfileUserId}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        <div className="h-full mx-auto">
          {/* Home timeline stays mounted to preserve scroll position. */}
          <div
            ref={homeScrollRef}
            className={['h-full overflow-y-auto', page.kind === 'home' ? 'block' : 'hidden'].join(
              ' ',
            )}
          >
            <HomeTimelinePage
              activeTab={activeTimelineTab}
              errorMessage={
                timelineQuery.error instanceof Error ? timelineQuery.error.message : null
              }
              hasNextPage={Boolean(timelineQuery.hasNextPage)}
              isFetchingNextPage={timelineQuery.isFetchingNextPage}
              isLoading={timelineQuery.isLoading}
              onRetry={() => void timelineQuery.refetch()}
              onLoadNextPage={() => void timelineQuery.fetchNextPage()}
              onCommentClick={navigateToStatusDetail}
              onTabChange={(tab) => void setHomeTimelineTab(tab)}
              items={timelineItems}
            />
          </div>

          <div
            className={['h-full overflow-y-auto', page.kind === 'status' ? 'block' : 'hidden'].join(
              ' ',
            )}
          >
            {statusDetailQuery.isLoading ? (
              <PageLoadingState label="Loading this Weibo post..." />
            ) : null}
            {!statusDetailQuery.isLoading && statusDetailQuery.error instanceof Error ? (
              <PageErrorState description={statusDetailQuery.error.message} />
            ) : null}
            {!statusDetailQuery.isLoading && !statusDetailQuery.error && statusDetailQuery.data ? (
              <StatusDetailPage
                detail={statusDetailQuery.data}
                comments={statusComments}
                hasNextPage={Boolean(statusCommentsQuery.hasNextPage)}
                isFetchingNextPage={statusCommentsQuery.isFetchingNextPage}
                onLoadNextPage={() => void statusCommentsQuery.fetchNextPage()}
              />
            ) : null}
          </div>
        </div>
      </ShellFrame>
    )
  }

  if (page.kind === 'profile') {
    return (
      <ShellFrame
        pageKind={page.kind}
        viewingProfileUserId={viewingProfileUserId}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        <div className="h-full overflow-y-auto">
          {profileInfoQuery.isLoading || profilePostsQuery.isLoading ? (
            <PageLoadingState label="Loading this profile..." />
          ) : null}
          {!profileInfoQuery.isLoading &&
          !profilePostsQuery.isLoading &&
          (profileInfoQuery.error instanceof Error || profilePostsQuery.error instanceof Error) ? (
            <PageErrorState
              description={
                (profileInfoQuery.error as Error | null)?.message ??
                (profilePostsQuery.error as Error | null)?.message ??
                'Unknown Weibo profile error'
              }
            />
          ) : null}
          {!profileInfoQuery.isLoading &&
          !profilePostsQuery.isLoading &&
          !profileInfoQuery.error &&
          !profilePostsQuery.error &&
          profileInfoQuery.data &&
          profilePostsQuery.data ? (
            <ProfilePage
              posts={profilePostsQuery.data}
              profile={profileInfoQuery.data}
              onCommentClick={navigateToStatusDetail}
            />
          ) : null}
        </div>
      </ShellFrame>
    )
  }

  return (
    <ShellFrame
      pageKind={page.kind}
      viewingProfileUserId={viewingProfileUserId}
      rewriteEnabled={rewriteEnabled}
      theme={theme}
      onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
      onThemeChange={(nextTheme) => void setTheme(nextTheme)}
    >
      <div className="h-full overflow-y-auto">
        <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">{PAGE_LABELS[page.kind]}</CardTitle>
            <CardDescription>{describePage(page)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>ShadowRoot shell mounted successfully.</p>
            <p>Route sync is active and listening for main-world history updates.</p>
          </CardContent>
        </Card>
      </div>
    </ShellFrame>
  )
}
