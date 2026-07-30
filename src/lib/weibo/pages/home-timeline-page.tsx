import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { HomeTab } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { NewPostsBubble } from '@/lib/weibo/components/new-posts-bubble'
import {
  TimelineTopBar,
  type TimelineTopBarOption,
  type TimelineTopBarOptionGroup,
} from '@/lib/weibo/components/timeline-top-bar'
import {
  flattenInfiniteItems,
  followingNewPostsCheckOptions,
  followGroupsQueryOptions,
  homeTimelineInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import {
  getDefaultFollowGroupForHomeTab,
  getHomeTabForDefaultFollowGroupId,
} from '@/lib/weibo/models/explore-utils'
import type { FeedItem, TimelinePage } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

type HomeTimelineMenuValue = `tab:${HomeTab}` | `group:${string}`

function tabMenuValue(tab: HomeTab): HomeTimelineMenuValue {
  return `tab:${tab}`
}

function groupMenuValue(gid: string): HomeTimelineMenuValue {
  return `group:${gid}`
}

const HOME_TIMELINE_OPTIONS: TimelineTopBarOption<HomeTimelineMenuValue>[] = [
  { value: tabMenuValue('for-you'), label: '推荐' },
  { value: tabMenuValue('following'), label: '我关注的' },
  { value: tabMenuValue('special-follow'), label: '特别关注' },
  { value: tabMenuValue('friend-circle'), label: '朋友圈' },
]

function resetMainScrollAfterRouteChange(resetMainScroll: () => void) {
  requestAnimationFrame(resetMainScroll)
}

export function HomeTimelinePage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const pageTab = page.kind === 'home' ? page.tab : 'for-you'
  const isEnabled = rewriteEnabled && page.kind === 'home'

  const groupIdFromUrl = page.kind === 'home' && page.groupId ? page.groupId : null
  const selectedGroupGid = groupIdFromUrl ?? 'default'

  const groupsQuery = useQuery({
    ...followGroupsQueryOptions,
    enabled: isEnabled,
  })

  const defaultGroups = groupsQuery.data?.defaultGroups
  const activeTab = getHomeTabForDefaultFollowGroupId(defaultGroups, groupIdFromUrl) ?? pageTab
  const defaultTimelineGroup =
    activeTab === 'special-follow' || activeTab === 'friend-circle'
      ? getDefaultFollowGroupForHomeTab(defaultGroups, activeTab)
      : null
  const groupListId =
    activeTab === 'following'
      ? selectedGroupGid !== 'default'
        ? selectedGroupGid
        : null
      : (defaultTimelineGroup?.gid ?? null)
  const followingNewPostsGroupKey = groupListId ?? 'default'
  const isResolvingGroupIdFromUrl =
    pageTab === 'following' && groupIdFromUrl !== null && groupsQuery.isPending

  const timelineQuery = useInfiniteQuery({
    ...homeTimelineInfiniteOptions(activeTab, groupListId),
    enabled: isEnabled && !isResolvingGroupIdFromUrl,
  })

  const items = useMemo(
    () => flattenInfiniteItems<FeedItem>(timelineQuery.data?.pages as TimelinePage[] | undefined),
    [timelineQuery.data?.pages],
  )

  const errorMessage =
    timelineQuery.error instanceof Error && !timelineQuery.isFetchNextPageError
      ? timelineQuery.error.message
      : null
  const loadMoreErrorMessage =
    timelineQuery.error instanceof Error && timelineQuery.isFetchNextPageError
      ? timelineQuery.error.message
      : null
  const hasNextPage = Boolean(timelineQuery.hasNextPage)
  const isFetchingNextPage = timelineQuery.isFetchingNextPage
  const isLoading = timelineQuery.isLoading
  const isRefreshing = timelineQuery.isFetching && !isFetchingNextPage && !isLoading

  // ─── New posts check (following tab only) ───
  const followingFirstItemId =
    items.length > 0 && activeTab === 'following' ? (items[0]?.id ?? null) : null

  const newPostsCheckQuery = useQuery({
    ...followingNewPostsCheckOptions(followingFirstItemId, groupListId),
    enabled: isEnabled && activeTab === 'following' && followingFirstItemId !== null,
    refetchOnWindowFocus: true,
  })

  const dismissedNewPostsCheckAtByGroup = useRef<Record<string, number>>({})
  const dismissedForGroup = dismissedNewPostsCheckAtByGroup.current[followingNewPostsGroupKey] ?? 0
  const showNewPostsBubble =
    activeTab === 'following' &&
    Boolean(newPostsCheckQuery.data) &&
    !newPostsCheckQuery.isFetching &&
    newPostsCheckQuery.dataUpdatedAt > dismissedForGroup

  // Scroll to top only after a triggered refresh completes, mirroring
  // explore / notifications / favorites. The trigger itself (refetch + bubble
  // dismissal) stays synchronous so the spinner shows immediately.
  const wasRefreshingRef = useRef(false)
  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      ctx.scrollMainToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, ctx])

  const handleTimelineRefresh = useCallback(() => {
    dismissedNewPostsCheckAtByGroup.current[followingNewPostsGroupKey] = Date.now()
    void timelineQuery.refetch()
  }, [timelineQuery, followingNewPostsGroupKey])

  const isCustomGroupRoute = activeTab === 'following' && selectedGroupGid !== 'default'
  const handleTimelineMenuChange = useCallback(
    (value: HomeTimelineMenuValue) => {
      if (value.startsWith('group:')) {
        const gid = value.slice('group:'.length)
        if (gid === selectedGroupGid) return
        ctx.onFollowGroupChange(gid)
        resetMainScrollAfterRouteChange(ctx.resetMainScroll)
        return
      }

      const tab = value.slice('tab:'.length) as HomeTab
      if (!isCustomGroupRoute && tab === activeTab) return
      ctx.onHomeTabChange(tab)
      resetMainScrollAfterRouteChange(ctx.resetMainScroll)
    },
    [activeTab, ctx, isCustomGroupRoute, selectedGroupGid],
  )

  const groups = groupsQuery.data?.groups ?? []
  const customGroupOptions: TimelineTopBarOption<HomeTimelineMenuValue>[] = groups.map((group) => ({
    value: groupMenuValue(group.gid),
    label: group.title,
  }))
  const activeCustomGroup = isCustomGroupRoute
    ? customGroupOptions.find((option) => option.value === groupMenuValue(selectedGroupGid))
    : undefined
  const activeDefaultTitle =
    HOME_TIMELINE_OPTIONS.find((option) => option.value === tabMenuValue(activeTab))?.label ??
    '推荐'
  const activeTitle =
    activeCustomGroup?.label ?? (isCustomGroupRoute ? '自定义分组' : activeDefaultTitle)
  const activeMenuValue = isCustomGroupRoute
    ? groupMenuValue(selectedGroupGid)
    : tabMenuValue(activeTab)
  const titleOptionGroups: TimelineTopBarOptionGroup<HomeTimelineMenuValue>[] = [
    {
      label: '默认分组',
      options: HOME_TIMELINE_OPTIONS,
    },
    {
      label: '自定义分组',
      className: 'max-h-[200px] overflow-y-auto',
      options: customGroupOptions,
    },
  ]

  return (
    <div className="relative">
      <TimelineTopBar
        title={activeTitle}
        titleValue={activeMenuValue}
        titleOptionGroups={titleOptionGroups}
        onTitleChange={handleTimelineMenuChange}
        onRefresh={handleTimelineRefresh}
        isRefreshing={isRefreshing}
        rightAction={
          showNewPostsBubble ? (
            <NewPostsBubble
              key={newPostsCheckQuery.dataUpdatedAt}
              authors={newPostsCheckQuery.data?.authors ?? []}
              count={newPostsCheckQuery.data?.count ?? 0}
            />
          ) : undefined
        }
      />

      <div className="flex flex-col">
        <InfiniteFeedList
          pages={timelineQuery.data?.pages as TimelinePage[] | undefined}
          emptyLabel="此时间线暂无内容"
          loadingLabel="正在加载微博时间线..."
          errorMessage={errorMessage}
          loadMoreErrorMessage={loadMoreErrorMessage}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={timelineQuery.fetchNextPage}
          onRetry={() => void timelineQuery.refetch()}
          onNavigate={ctx.navigateToStatusDetail}
          onCommentClick={(item) =>
            ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
          }
          onRepostClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
        />
      </div>
    </div>
  )
}
