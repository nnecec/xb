import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
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

interface RefreshTabTriggerProps {
  value: string
  label: string
  isActive: boolean
  onRefresh: () => void
  isRefreshing: boolean
}

function RefreshTabTrigger({
  value,
  label,
  isActive,
  onRefresh,
  isRefreshing,
}: RefreshTabTriggerProps) {
  const [isHovered, setIsHovered] = useState(false)

  const showRefresh = isActive && (isHovered || isRefreshing)

  return (
    <TabsTrigger
      value={value}
      className={cn('relative overflow-hidden', isActive && showRefresh && 'text-foreground')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (isActive && !isRefreshing) {
          onRefresh()
        }
      }}
    >
      <AnimatePresence mode="wait">
        {showRefresh ? (
          <motion.span
            key="refresh"
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
            刷新
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </TabsTrigger>
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

  const items = useMemo(
    () => flattenInfiniteItems<FeedItem>(timelineQuery.data?.pages as TimelinePage[] | undefined),
    [timelineQuery.data?.pages],
  )

  const errorMessage = timelineQuery.error instanceof Error ? timelineQuery.error.message : null
  const hasNextPage = Boolean(timelineQuery.hasNextPage)
  const isFetchingNextPage = timelineQuery.isFetchingNextPage
  const isLoading = timelineQuery.isLoading
  const isRefreshing = timelineQuery.isFetching && !isFetchingNextPage && !isLoading

  const fetchNextPageRef = useRef(timelineQuery.fetchNextPage)
  fetchNextPageRef.current = timelineQuery.fetchNextPage

  const wasRefreshingRef = useRef(false)

  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      ctx.scrollMainToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, ctx])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPageRef.current()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage])

  const handleGroupClick = (group: ExploreGroup) => {
    navigate(`/hot/weibo/${group.gid}`)
  }

  return (
    <Tabs
      value={groupId}
      className="flex flex-col"
      onValueChange={(value) => {
        const group = groups.find((g) => g.gid === value)
        if (group) {
          handleGroupClick(group)
        }
      }}
    >
      <div className="bg-muted/60 sticky top-0 z-10 backdrop-blur">
        {groupsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : groupsQuery.error ? (
          <PageErrorState description="加载分组失败" onRetry={() => void groupsQuery.refetch()} />
        ) : groups.length === 0 ? (
          <TabsList className="grid w-full grid-cols-2" variant="line">
            <TabsTrigger value="102803">热门</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="flex w-full justify-start gap-2 overflow-x-auto pb-2" variant="line">
            {groups.map((group) => (
              <RefreshTabTrigger
                key={group.gid}
                value={group.gid}
                label={group.title}
                isActive={group.gid === groupId}
                onRefresh={() => void timelineQuery.refetch()}
                isRefreshing={group.gid === groupId && isRefreshing}
              />
            ))}
          </TabsList>
        )}
      </div>

      <TabsContent value={groupId} className="flex flex-col gap-3">
        {isLoading ? <PageLoadingState label="正在加载探索内容..." /> : null}
        {!isLoading && errorMessage ? (
          <PageErrorState description={errorMessage} onRetry={() => void timelineQuery.refetch()} />
        ) : null}
        {!isLoading && !errorMessage ? (
          <FeedList
            items={items}
            emptyLabel="暂无内容"
            onNavigate={ctx.navigateToStatusDetail}
            onNavigateProfile={ctx.navigateToProfile}
            onCommentClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
            }
            onRepostClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))
            }
          />
        ) : null}
        {hasNextPage ? (
          <div ref={loadMoreRef} className="flex justify-center py-3">
            {isFetchingNextPage ? <Spinner size="sm" /> : null}
          </div>
        ) : null}
      </TabsContent>
    </Tabs>
  )
}
