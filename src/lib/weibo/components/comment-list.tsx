import { CommentCard } from '@/lib/weibo/components/comment-card'
import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'

export function CommentList({
  comments,
  emptyLabel,
  rootStatusId,
  authorUid,
  onCommentReply,
}: {
  comments: CommentItem[]
  emptyLabel: string
  rootStatusId: string
  authorUid?: string
  onCommentReply?: (target: ComposeTarget) => void
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
          authorUid={authorUid}
          onCommentReply={onCommentReply}
          key={item.id}
        />
      ))}
    </div>
  )
}
