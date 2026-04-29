import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { FeedList } from '@/lib/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { FeedItem, TimelinePage } from '@/lib/weibo/models/feed'
import {
  flattenInfiniteItems,
  exploreGroupsQueryOptions,
  exploreTimelineInfiniteOptions,
} from '@/lib/weibo/queries/weibo-queries'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import type { ExploreGroup } from '@/lib/weibo/services/adapters/explore-groups'

function GroupTabButton({
  group,
  isActive,
  isRefreshing,
  onClick,
  onRefresh,
}: {
  group: ExploreGroup
  isActive: boolean
  isRefreshing: boolean
  onClick: () => void
  onRefresh: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={isActive ? onRefresh : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-15"
    >
      {isActive && (isRefreshing || isHovered) ? (
        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      ) : (
        group.title
      )}
    </Button>
  )
}

export function ExplorePage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const navigate = useNavigate()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

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

  const items = flattenInfiniteItems<FeedItem>(
    timelineQuery.data?.pages as TimelinePage[] | undefined,
  )

  const errorMessage = timelineQuery.error instanceof Error ? timelineQuery.error.message : null
  const hasNextPage = Boolean(timelineQuery.hasNextPage)
  const isFetchingNextPage = timelineQuery.isFetchingNextPage
  const isLoading = timelineQuery.isLoading
  const isRefreshing = timelineQuery.isFetching && !isFetchingNextPage && !isLoading

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void timelineQuery.fetchNextPage()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, timelineQuery])

  const handleGroupClick = (group: ExploreGroup) => {
    navigate(`/hot/weibo/${group.gid}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10">
        {groupsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : groupsQuery.error ? (
          <PageErrorState description="加载分组失败" onRetry={() => void groupsQuery.refetch()} />
        ) : groups.length === 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={groupId === '102803' ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate('/hot/weibo/102803')}
            >
              热门
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map((group) => (
              <GroupTabButton
                key={group.gid}
                group={group}
                isActive={group.gid === groupId}
                isRefreshing={isRefreshing}
                onClick={() => handleGroupClick(group)}
                onRefresh={() => void timelineQuery.refetch()}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading ? <PageLoadingState label="正在加载探索内容..." /> : null}
      {!isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} onRetry={() => void timelineQuery.refetch()} />
      ) : null}
      {!isLoading && !errorMessage ? (
        <FeedList
          items={items}
          emptyLabel="暂无内容"
          onNavigate={ctx.navigateToStatusDetail}
          onCommentClick={(item) =>
            ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
          }
          onRepostClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
        />
      ) : null}
      {hasNextPage ? (
        <div ref={loadMoreRef} className="flex justify-center py-3">
          {isFetchingNextPage ? <Spinner size="sm" /> : null}
        </div>
      ) : null}
      {hasNextPage && !isFetchingNextPage ? (
        <Button variant="outline" onClick={() => void timelineQuery.fetchNextPage()}>
          加载下一页
        </Button>
      ) : null}
    </div>
  )
}
