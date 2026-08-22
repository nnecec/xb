import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useAppSettings } from '@/lib/app-settings-store'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import { favoritesInfiniteOptions } from '@/lib/weibo/data/weibo-data'
import type { TimelinePage } from '@/lib/weibo/models/feed'

const SAVED_LIST_OPTIONS = [
  { value: 'favorites', label: '我的收藏' },
  { value: 'liked', label: '我的赞' },
]

export function FavoritesPage({ source }: { source?: { uid: string } } = {}) {
  const runtime = usePageRuntime()
  const page = runtime.page
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const uid = source?.uid ?? (page.kind === 'favorites' ? page.uid : '')
  const isEnabled = rewriteEnabled && (source !== undefined || page.kind === 'favorites')

  const favoritesQuery = useInfiniteQuery({
    ...favoritesInfiniteOptions(uid),
    enabled: isEnabled && uid !== '',
  })

  const errorMessage =
    favoritesQuery.error instanceof Error && !favoritesQuery.isFetchNextPageError
      ? favoritesQuery.error.message
      : null
  const loadMoreErrorMessage =
    favoritesQuery.error instanceof Error && favoritesQuery.isFetchNextPageError
      ? favoritesQuery.error.message
      : null
  const hasNextPage = Boolean(favoritesQuery.hasNextPage)
  const isFetchingNextPage = favoritesQuery.isFetchingNextPage
  const isLoading = favoritesQuery.isLoading
  const isRefreshing = favoritesQuery.isFetching && !isFetchingNextPage && !isLoading

  const wasRefreshingRef = useRef(false)
  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      runtime.scrollToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, runtime])

  const handleSavedListChange = (value: string) => {
    if (value === 'liked' && uid !== '') {
      runtime.navigate(`/u/page/like/${uid}`)
    }
  }

  return (
    <div className="flex flex-col">
      <TimelineTopBar
        title="我的收藏"
        titleOptions={source ? undefined : SAVED_LIST_OPTIONS}
        titleValue={source ? undefined : 'favorites'}
        onTitleChange={source ? undefined : handleSavedListChange}
        onRefresh={() => void favoritesQuery.refetch()}
        isRefreshing={isRefreshing}
      />

      <InfiniteFeedList
        scrollRootRef={runtime.scrollRootRef}
        pages={favoritesQuery.data?.pages as TimelinePage[] | undefined}
        emptyLabel="暂无收藏内容"
        loadingLabel="正在加载收藏…"
        errorMessage={errorMessage}
        loadMoreErrorMessage={loadMoreErrorMessage}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={favoritesQuery.fetchNextPage}
        onRetry={() => void favoritesQuery.refetch()}
      />
    </div>
  )
}
