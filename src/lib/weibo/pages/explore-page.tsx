import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { PageErrorState } from '@/lib/weibo/components/page-state'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import {
  exploreGroupsQueryOptions,
  exploreTimelineInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { ExploreGroup } from '@/lib/weibo/models/explore'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

function resetMainScrollAfterRouteChange(resetMainScroll: () => void) {
  requestAnimationFrame(resetMainScroll)
}

export function ExplorePage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const navigate = useNavigate()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const groupId = page.kind === 'explore' ? page.groupId : '102803'
  const isEnabled = rewriteEnabled && page.kind === 'explore'

  const groupsQuery = useQuery(exploreGroupsQueryOptions)
  const groups = groupsQuery.data ?? []
  const activeGroup = groups.find((g) => g.gid === groupId) ?? groups[0]

  const timelineQuery = useInfiniteQuery({
    ...exploreTimelineInfiniteOptions(
      activeGroup ?? {
        gid: groupId,
        containerid: groupId,
        title: '',
      },
    ),
    enabled: isEnabled && Boolean(activeGroup),
  })

  const errorMessage = timelineQuery.error instanceof Error ? timelineQuery.error.message : null
  const hasNextPage = Boolean(timelineQuery.hasNextPage)
  const isFetchingNextPage = timelineQuery.isFetchingNextPage
  const isLoading = timelineQuery.isLoading
  const isRefreshing = timelineQuery.isFetching && !isFetchingNextPage && !isLoading

  const wasRefreshingRef = useRef(false)

  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      ctx.scrollMainToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, ctx])

  const handleGroupClick = (group: ExploreGroup) => {
    if (group.gid === groupId) return
    navigate(`/hot/weibo/${group.gid}`)
    resetMainScrollAfterRouteChange(ctx.resetMainScroll)
  }

  const groupOptions =
    groups.length > 0
      ? groups.map((group) => ({ value: group.gid, label: group.title }))
      : [{ value: '102803', label: '热门' }]
  const activeGroupLabel =
    activeGroup?.title ?? groupOptions.find((option) => option.value === groupId)?.label ?? '热门'

  return (
    <div className="flex flex-col">
      <TimelineTopBar
        title={activeGroupLabel}
        titleOptions={groupOptions}
        titleValue={groupId}
        onTitleChange={(value) => {
          const group = groups.find((g) => g.gid === value)
          if (group) {
            handleGroupClick(group)
          }
        }}
        onRefresh={() => void timelineQuery.refetch()}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-col gap-3">
        {groupsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : null}
        {groupsQuery.error ? (
          <PageErrorState description="加载分组失败" onRetry={() => void groupsQuery.refetch()} />
        ) : null}
        <InfiniteFeedList
          pages={timelineQuery.data?.pages as TimelinePage[] | undefined}
          emptyLabel="暂无内容"
          loadingLabel="正在加载探索内容..."
          errorMessage={errorMessage}
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
