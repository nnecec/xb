import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import { favoritesInfiniteOptions } from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

const SAVED_LIST_OPTIONS = [
  { value: 'favorites', label: '我的收藏' },
  { value: 'liked', label: '我的赞' },
]

export function FavoritesPage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const navigate = useNavigate()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const uid = page.kind === 'favorites' ? page.uid : ''
  const isEnabled = rewriteEnabled && page.kind === 'favorites'

  const favoritesQuery = useInfiniteQuery({
    ...favoritesInfiniteOptions(uid),
    enabled: isEnabled && uid !== '',
  })

  const errorMessage = favoritesQuery.error instanceof Error ? favoritesQuery.error.message : null
  const hasNextPage = Boolean(favoritesQuery.hasNextPage)
  const isFetchingNextPage = favoritesQuery.isFetchingNextPage
  const isLoading = favoritesQuery.isLoading
  const isRefreshing = favoritesQuery.isFetching && !isFetchingNextPage && !isLoading

  const wasRefreshingRef = useRef(false)
  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      ctx.scrollMainToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, ctx])

  const handleSavedListChange = (value: string) => {
    if (value === 'liked' && uid !== '') {
      navigate(`/u/page/like/${uid}`)
    }
  }

  return (
    <div className="flex flex-col">
      <TimelineTopBar
        title="我的收藏"
        titleOptions={SAVED_LIST_OPTIONS}
        titleValue="favorites"
        onTitleChange={handleSavedListChange}
        onRefresh={() => void favoritesQuery.refetch()}
        isRefreshing={isRefreshing}
      />

      <InfiniteFeedList
        pages={favoritesQuery.data?.pages as TimelinePage[] | undefined}
        emptyLabel="暂无收藏内容"
        loadingLabel="正在加载收藏..."
        errorMessage={errorMessage}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={favoritesQuery.fetchNextPage}
        onRetry={() => void favoritesQuery.refetch()}
        onNavigate={ctx.navigateToStatusDetail}
        onCommentClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
        onRepostClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
      />
    </div>
  )
}
