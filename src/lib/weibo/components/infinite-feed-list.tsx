import { useEffect, useMemo, useRef } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { FeedList } from '@/lib/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { flattenInfiniteItems } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { useFeedRatingBatchSync } from '@/lib/weibo/rating/xb-rating'

interface InfiniteFeedListProps {
  pages: Array<{ items: FeedItem[] }> | undefined
  emptyLabel: string
  loadingLabel: string
  errorMessage: string | null
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void | Promise<unknown>
  onRetry?: () => void
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  className?: string
}

export function InfiniteFeedList({
  pages,
  emptyLabel,
  loadingLabel,
  errorMessage,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onRetry,
  onNavigate,
  onCommentClick,
  onRepostClick,
  className = 'flex flex-col gap-3',
}: InfiniteFeedListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const fetchNextPageRef = useRef(fetchNextPage)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  fetchNextPageRef.current = fetchNextPage
  isFetchingNextPageRef.current = isFetchingNextPage

  const items = useMemo(() => flattenInfiniteItems<FeedItem>(pages), [pages])

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

  return (
    <div className={className}>
      {isLoading ? <PageLoadingState label={loadingLabel} /> : null}
      {!isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} onRetry={onRetry} />
      ) : null}
      {!isLoading && !errorMessage ? (
        <FeedList
          items={items}
          emptyLabel={emptyLabel}
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
    </div>
  )
}
