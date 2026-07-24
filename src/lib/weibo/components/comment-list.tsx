import { CommentCard } from '@/lib/weibo/components/comment-card'
import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { CommentItem } from '@/lib/weibo/models/status'

export function CommentList({
  comments,
  emptyLabel,
  rootStatusId,
  authorUid,
}: {
  comments: CommentItem[]
  emptyLabel: string
  rootStatusId: string
  authorUid?: string
}) {
  if (comments.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return (
    <div className="flex flex-col">
      {comments.map((item) => (
        <div key={item.id} className="py-3 first:pt-0 last:pb-0">
          <CommentCard item={item} rootStatusId={rootStatusId} authorUid={authorUid} />
        </div>
      ))}
    </div>
  )
}
