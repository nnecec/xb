import { useInfiniteQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import { likedStatusesInfiniteOptions } from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

const SAVED_LIST_OPTIONS = [
  { value: 'favorites', label: '全部收藏' },
  { value: 'liked', label: '我的赞' },
]

export function LikedStatusesPage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const navigate = useNavigate()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const uid = page.kind === 'liked' ? page.uid : ''
  const isEnabled = rewriteEnabled && page.kind === 'liked'

  const likedStatusesQuery = useInfiniteQuery({
    ...likedStatusesInfiniteOptions(uid),
    enabled: isEnabled && uid !== '',
  })

  const errorMessage =
    likedStatusesQuery.error instanceof Error && !likedStatusesQuery.isFetchNextPageError
      ? likedStatusesQuery.error.message
      : null
  const loadMoreErrorMessage =
    likedStatusesQuery.error instanceof Error && likedStatusesQuery.isFetchNextPageError
      ? likedStatusesQuery.error.message
      : null
  const hasNextPage = Boolean(likedStatusesQuery.hasNextPage)
  const isFetchingNextPage = likedStatusesQuery.isFetchingNextPage
  const isLoading = likedStatusesQuery.isLoading
  const isRefreshing = likedStatusesQuery.isFetching && !isFetchingNextPage && !isLoading
  const handleSavedListChange = (value: string) => {
    if (value === 'favorites' && uid !== '') {
      navigate(`/u/page/fav/${uid}`)
    }
  }

  return (
    <div className="flex flex-col">
      <TimelineTopBar
        title="我的赞"
        titleOptions={SAVED_LIST_OPTIONS}
        titleValue="liked"
        onTitleChange={handleSavedListChange}
        onRefresh={() => void likedStatusesQuery.refetch()}
        isRefreshing={isRefreshing}
      />

      <InfiniteFeedList
        pages={likedStatusesQuery.data?.pages as TimelinePage[] | undefined}
        emptyLabel="暂无点赞内容"
        loadingLabel="正在加载我的赞..."
        errorMessage={errorMessage}
        loadMoreErrorMessage={loadMoreErrorMessage}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={likedStatusesQuery.fetchNextPage}
        onRetry={() => void likedStatusesQuery.refetch()}
        onNavigate={ctx.navigateToStatusDetail}
        onCommentClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
        onRepostClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
      />
    </div>
  )
}
