import { useEffect, useMemo, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { StatusCard } from '@/lib/weibo/components/status-card'
import { flattenInfiniteItems } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { useFeedRatingBatchSync } from '@/lib/weibo/rating/xb-rating'

interface InfiniteFeedListProps {
  pages: Array<{ items: FeedItem[] }> | undefined
  emptyLabel: string
  loadingLabel: string
  errorMessage: string | null
  loadMoreErrorMessage?: string | null
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void | Promise<unknown>
  onRetry?: () => void
  className?: string
}

export function InfiniteFeedList({
  pages,
  emptyLabel,
  loadingLabel,
  errorMessage,
  loadMoreErrorMessage = null,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onRetry,
  className = 'flex flex-col gap-3',
}: InfiniteFeedListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const fetchNextPageRef = useRef(fetchNextPage)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  fetchNextPageRef.current = fetchNextPage
  isFetchingNextPageRef.current = isFetchingNextPage

  const items = useMemo(() => flattenInfiniteItems<FeedItem>(pages), [pages])
  const hasItems = items.length > 0
  const showInitialError = Boolean(errorMessage) && !hasItems
  const showFeed = !showInitialError

  useFeedRatingBatchSync(pages)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPageRef.current) {
          void fetchNextPageRef.current()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage])

  const handleLoadMoreRetry = () => {
    void fetchNextPage()
  }

  return (
    <div className={className}>
      {isLoading ? <PageLoadingState label={loadingLabel} /> : null}
      {!isLoading && showInitialError ? (
        <PageErrorState description={errorMessage!} onRetry={onRetry} />
      ) : null}
      {!isLoading && showFeed ? (
        items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} data-feed-id={item.id}>
                <StatusCard status={item} />
              </div>
            ))}
          </div>
        ) : (
          <PageEmptyState label={emptyLabel} />
        )
      ) : null}
      {!isLoading && loadMoreErrorMessage ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <p className="text-destructive text-sm">{loadMoreErrorMessage}</p>
          <Button size="sm" variant="outline" onClick={handleLoadMoreRetry}>
            加载失败，点击重试
          </Button>
        </div>
      ) : null}
      {hasNextPage ? (
        <div ref={loadMoreRef} className="flex justify-center py-3">
          {isFetchingNextPage ? <Spinner size="sm" /> : null}
        </div>
      ) : null}
    </div>
  )
}
