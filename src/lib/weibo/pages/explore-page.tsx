import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { PageErrorState } from '@/lib/weibo/components/page-state'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import {
  exploreGroupsQueryOptions,
  exploreTimelineInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import type { ExploreGroup } from '@/lib/weibo/models/explore'
import type { TimelinePage } from '@/lib/weibo/models/feed'

function resetMainScrollAfterRouteChange(resetMainScroll: () => void) {
  requestAnimationFrame(resetMainScroll)
}

export interface ExplorePageProps {
  source?: { groupId: string }
  onSourceChange?: (source: { groupId: string }) => void
}

export function ExplorePage({ source, onSourceChange }: ExplorePageProps = {}) {
  const runtime = usePageRuntime()
  const page = source ? { kind: 'explore' as const, ...source } : runtime.page
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const groupId = page.kind === 'explore' ? page.groupId : '102803'
  const isEnabled = rewriteEnabled && (source !== undefined || page.kind === 'explore')

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

  const wasRefreshingRef = useRef(false)

  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      runtime.scrollToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, runtime])

  const handleGroupClick = (group: ExploreGroup) => {
    if (group.gid === groupId) return
    if (onSourceChange) {
      onSourceChange({ groupId: group.gid })
    } else {
      runtime.navigate(`/hot/weibo/${group.gid}`)
    }
    resetMainScrollAfterRouteChange(runtime.resetScroll)
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
        onTitleChange={
          source
            ? undefined
            : (value) => {
                const group = groups.find((g) => g.gid === value)
                if (group) {
                  handleGroupClick(group)
                }
              }
        }
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
          scrollRootRef={runtime.scrollRootRef}
          pages={timelineQuery.data?.pages as TimelinePage[] | undefined}
          emptyLabel="暂无内容"
          loadingLabel="正在加载探索内容…"
          errorMessage={errorMessage}
          loadMoreErrorMessage={loadMoreErrorMessage}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={timelineQuery.fetchNextPage}
          onRetry={() => void timelineQuery.refetch()}
        />
      </div>
    </div>
  )
}
