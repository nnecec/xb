import { Button } from '@/components/ui/button'
import { CommentList } from '@/features/weibo/components/comment-list'
import { FeedCard } from '@/features/weibo/components/feed-card'
import type { StatusDetail } from '@/features/weibo/models/status'
import type { CommentItem } from '@/features/weibo/models/status'

export function StatusDetailPage({
  detail,
  comments,
  hasNextPage,
  isFetchingNextPage,
  onLoadNextPage,
}: {
  detail: StatusDetail
  comments: CommentItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadNextPage: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <FeedCard item={detail.status} />
      <CommentList comments={comments} emptyLabel="No replies are available for this post yet." />
      {hasNextPage ? (
        <Button variant="outline" onClick={onLoadNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载下一页评论'}
        </Button>
      ) : null}
    </div>
  )
}
