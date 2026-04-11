import { CommentCard } from '@/features/weibo/components/comment-card'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import { PageEmptyState } from '@/features/weibo/components/page-state'
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

  return comments.map((item) => (
    <CommentCard
      key={item.id}
      item={item}
      rootStatusId={rootStatusId}
      onCommentReply={onCommentReply}
      onNavigate={onNavigate}
    />
  ))
}
