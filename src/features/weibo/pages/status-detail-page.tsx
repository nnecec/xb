import type { StatusDetail } from '@/features/weibo/models/status'
import type { FeedItem } from '@/features/weibo/models/feed'
import { Button } from '@/components/ui/button'

import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'

export function StatusDetailPage({
  detail,
  comments,
  hasNextPage,
  isFetchingNextPage,
  onLoadNextPage,
}: {
  detail: StatusDetail
  comments: FeedItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadNextPage: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <FeedCard item={detail.status} />
      {comments.length > 0
        ? comments.map((reply) => <FeedCard key={reply.id} item={reply} />)
        : <PageEmptyState label="No replies are available for this post yet." />}
      {hasNextPage ? (
        <Button variant="outline" onClick={onLoadNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载下一页评论'}
        </Button>
      ) : null}
    </div>
  )
}
