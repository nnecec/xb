import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { FeedList } from '@/features/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/features/weibo/models/compose'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import {
  favoritesInfiniteOptions,
  flattenInfiniteItems,
} from '@/features/weibo/queries/weibo-queries'
import { useWeiboPage } from '@/features/weibo/route/use-weibo-page'
import { useAppSettings } from '@/lib/app-settings-store'

export function FavoritesPage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const uid = page.kind === 'favorites' ? page.uid : ''
  const isEnabled = rewriteEnabled && page.kind === 'favorites'

  const favoritesQuery = useInfiniteQuery({
    ...favoritesInfiniteOptions(uid),
    enabled: isEnabled && uid !== '',
  })

  const items = flattenInfiniteItems<FeedItem>(
    favoritesQuery.data?.pages as TimelinePage[] | undefined,
  )

  const errorMessage = favoritesQuery.error instanceof Error ? favoritesQuery.error.message : null
  const hasNextPage = Boolean(favoritesQuery.hasNextPage)
  const isFetchingNextPage = favoritesQuery.isFetchingNextPage
  const isLoading = favoritesQuery.isLoading

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void favoritesQuery.fetchNextPage()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, favoritesQuery])

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? <PageLoadingState label="正在加载收藏..." /> : null}
      {!isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} onRetry={() => void favoritesQuery.refetch()} />
      ) : null}
      {!isLoading && !errorMessage ? (
        <FeedList
          items={items}
          emptyLabel="暂无收藏内容"
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
        <Button variant="outline" onClick={() => void favoritesQuery.fetchNextPage()}>
          加载下一页
        </Button>
      ) : null}
    </div>
  )
}
