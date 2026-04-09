import { CommentCard } from '@/features/weibo/components/comment-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'
import type { CommentItem } from '@/features/weibo/models/status'

export function CommentList({
  comments,
  emptyLabel,
}: {
  comments: CommentItem[]
  emptyLabel: string
}) {
  if (comments.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return comments.map((item) => <CommentCard key={item.id} item={item} />)
}
