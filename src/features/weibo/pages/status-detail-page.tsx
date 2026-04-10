import { Button } from '@/components/ui/button'
import { CommentList } from '@/features/weibo/components/comment-list'
import { FeedCard } from '@/features/weibo/components/feed-card'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { StatusDetail } from '@/features/weibo/models/status'
import type { CommentItem } from '@/features/weibo/models/status'

function createStatusComposeTarget({
  detail,
  mode,
}: {
  detail: StatusDetail
  mode: 'comment' | 'repost'
}): ComposeTarget {
  return {
    kind: 'status',
    mode,
    statusId: detail.status.id,
    targetCommentId: null,
    authorName: detail.status.author.name,
    excerpt: detail.status.text.trim().slice(0, 80),
  }
}

export function StatusDetailPage({
  detail,
  comments,
  hasNextPage,
  isFetchingNextPage,
  onLoadNextPage,
  onStatusComment,
  onStatusRepost,
  onCommentReply,
}: {
  detail: StatusDetail
  comments: CommentItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadNextPage: () => void
  onStatusComment?: (target: ComposeTarget) => void
  onStatusRepost?: (target: ComposeTarget) => void
  onCommentReply?: (target: ComposeTarget) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <FeedCard
        item={detail.status}
        onCommentClick={() => onStatusComment?.(createStatusComposeTarget({ detail, mode: 'comment' }))}
        onRepostClick={() => onStatusRepost?.(createStatusComposeTarget({ detail, mode: 'repost' }))}
      />
      <CommentList
        comments={comments}
        emptyLabel="No replies are available for this post yet."
        rootStatusId={detail.status.id}
        onCommentReply={onCommentReply}
      />
      {hasNextPage ? (
        <Button variant="outline" onClick={onLoadNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载下一页评论'}
        </Button>
      ) : null}
    </div>
  )
}
