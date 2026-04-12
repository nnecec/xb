import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { FeedList } from '@/features/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/features/weibo/models/compose'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import {
  flattenInfiniteItems,
  homeTimelineInfiniteOptions,
} from '@/features/weibo/queries/weibo-queries'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { useAppSettings } from '@/lib/app-settings-store'

export function HomeTimelinePage() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const page = useMemo(
    () =>
      parseWeiboUrl(new URL(`${location.pathname}${location.search}`, window.location.origin).href),
    [location.pathname, location.search],
  )

  const activeTab = page.kind === 'home' ? page.tab : 'for-you'
  const isEnabled = rewriteEnabled && page.kind === 'home'

  const timelineQuery = useInfiniteQuery({
    ...homeTimelineInfiniteOptions(activeTab),
    enabled: isEnabled,
  })

  const items = flattenInfiniteItems<FeedItem>(
    timelineQuery.data?.pages as TimelinePage[] | undefined,
  )

  const errorMessage = timelineQuery.error instanceof Error ? timelineQuery.error.message : null
  const hasNextPage = Boolean(timelineQuery.hasNextPage)
  const isFetchingNextPage = timelineQuery.isFetchingNextPage
  const isLoading = timelineQuery.isLoading

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

  return (
    <div>
      <Tabs
        value={activeTab}
        className="flex flex-col"
        onValueChange={(value) => ctx.onHomeTabChange(value as 'for-you' | 'following')}
      >
        <div className="sticky top-0 z-10 backdrop-blur">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="for-you">推荐</TabsTrigger>
            <TabsTrigger value="following">我关注的</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="flex flex-col gap-3">
          {isLoading ? <PageLoadingState label="正在加载微博时间线..." /> : null}
          {!isLoading && errorMessage ? (
            <PageErrorState
              description={errorMessage}
              onRetry={() => void timelineQuery.refetch()}
            />
          ) : null}
          {!isLoading && !errorMessage ? (
            <FeedList
              items={items}
              emptyLabel="此时间线暂无内容"
              onNavigate={ctx.navigateToStatusDetail}
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
          {hasNextPage && !isFetchingNextPage ? (
            <Button variant="outline" onClick={() => void timelineQuery.fetchNextPage()}>
              加载下一页
            </Button>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
