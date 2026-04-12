import { CommentCard } from '@/features/weibo/components/comment-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentItem } from '@/features/weibo/models/status'

export function CommentList({
  comments,
  emptyLabel,
  rootStatusId,
  onCommentReply,
  onNavigate,
}: {
  comments: CommentItem[]
  emptyLabel: string
  rootStatusId: string
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
  if (comments.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map((item) => (
        <CommentCard
          item={item}
          rootStatusId={rootStatusId}
          onCommentReply={onCommentReply}
          onNavigate={onNavigate}
          key={item.id}
        />
      ))}
    </div>
  )
}
