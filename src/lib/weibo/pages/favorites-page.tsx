import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { FeedList } from '@/lib/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { FeedItem, TimelinePage } from '@/lib/weibo/models/feed'
import { favoritesInfiniteOptions, flattenInfiniteItems } from '@/lib/weibo/queries/weibo-queries'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

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

  const items = useMemo(
    () => flattenInfiniteItems<FeedItem>(favoritesQuery.data?.pages as TimelinePage[] | undefined),
    [favoritesQuery.data?.pages],
  )

  const errorMessage = favoritesQuery.error instanceof Error ? favoritesQuery.error.message : null
  const hasNextPage = Boolean(favoritesQuery.hasNextPage)
  const isFetchingNextPage = favoritesQuery.isFetchingNextPage
  const isLoading = favoritesQuery.isLoading

  const fetchNextPageRef = useRef(favoritesQuery.fetchNextPage)
  fetchNextPageRef.current = favoritesQuery.fetchNextPage

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

  return (
    <div className="flex flex-col gap-3 pt-4">
      {isLoading ? <PageLoadingState label="正在加载收藏..." /> : null}
      {!isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} onRetry={() => void favoritesQuery.refetch()} />
      ) : null}
      {!isLoading && !errorMessage ? (
        <FeedList
          items={items}
          emptyLabel="暂无收藏内容"
          onNavigate={ctx.navigateToStatusDetail}
          onNavigateProfile={ctx.navigateToProfile}
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
    </div>
  )
}
