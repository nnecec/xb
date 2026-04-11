import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedList } from '@/features/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import type { TimelinePage } from '@/features/weibo/models/feed'
import type { FeedItem } from '@/features/weibo/models/feed'

export function HomeTimelinePage({
  activeTab,
  isLoading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onNavigate,
  onRetry,
  onLoadNextPage,
  onCommentClick,
  onRepostClick,
  onTabChange,
  items,
}: {
  activeTab: 'for-you' | 'following'
  isLoading: boolean
  errorMessage: string | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onNavigate?: (item: FeedItem) => void
  onRetry: () => void
  onLoadNextPage: () => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onTabChange: (value: 'for-you' | 'following') => void
  items: TimelinePage['items']
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadNextPage()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadNextPage])

  return (
    <Tabs
      value={activeTab}
      className="flex flex-col"
      onValueChange={(value) => onTabChange(value as 'for-you' | 'following')}
    >
      <div className="sticky top-0 z-10 backdrop-blur">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="for-you">推荐</TabsTrigger>
          <TabsTrigger value="following">我关注的</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="flex flex-col gap-3">
        {isLoading ? <PageLoadingState label="Loading your Weibo timeline..." /> : null}
        {!isLoading && errorMessage ? (
          <PageErrorState description={errorMessage} onRetry={onRetry} />
        ) : null}
        {!isLoading && !errorMessage ? (
          <FeedList
            items={items}
            emptyLabel="No posts are available for this timeline yet."
            onNavigate={onNavigate}
            onCommentClick={onCommentClick}
            onRepostClick={onRepostClick}
          />
        ) : null}
        {hasNextPage ? (
          <div ref={loadMoreRef} className="flex justify-center py-3">
            {isFetchingNextPage ? <Spinner size="sm" /> : null}
          </div>
        ) : null}
        {hasNextPage && !isFetchingNextPage ? (
          <Button variant="outline" onClick={onLoadNextPage}>
            加载下一页
          </Button>
        ) : null}
      </TabsContent>
    </Tabs>
  )
}
