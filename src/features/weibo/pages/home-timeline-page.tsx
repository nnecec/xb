import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedCard } from '@/features/weibo/components/feed-card'
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from '@/features/weibo/components/page-state'
import type { TimelinePage } from '@/features/weibo/models/feed'
import type { FeedItem } from '@/features/weibo/models/feed'

export function HomeTimelinePage({
  activeTab,
  isLoading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onRetry,
  onLoadNextPage,
  onCommentClick,
  onTabChange,
  items,
}: {
  activeTab: 'for-you' | 'following'
  isLoading: boolean
  errorMessage: string | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onRetry: () => void
  onLoadNextPage: () => void
  onCommentClick: (item: FeedItem) => void
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
      <div className="sticky top-0 z-10 px-4 pb-2 backdrop-blur">
        <TabsList className="grid w-full grid-cols-2 rounded-full">
          <TabsTrigger value="for-you" className="rounded-full">
            For You
          </TabsTrigger>
          <TabsTrigger value="following" className="rounded-full">
            Following
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="flex flex-col gap-3 px-4 pb-4">
        {isLoading ? <PageLoadingState label="Loading your Weibo timeline..." /> : null}
        {!isLoading && errorMessage ? (
          <PageErrorState description={errorMessage} onRetry={onRetry} />
        ) : null}
        {!isLoading && !errorMessage && items.length === 0 ? (
          <PageEmptyState label="No posts are available for this timeline yet." />
        ) : null}
        {!isLoading && !errorMessage
          ? items.map((item) => (
              <FeedCard key={item.id} item={item} onCommentClick={onCommentClick} />
            ))
          : null}
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
