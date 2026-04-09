import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'
import type { FeedItem } from '@/features/weibo/models/feed'

export function FeedList({
  items,
  emptyLabel,
  onCommentClick,
}: {
  items: FeedItem[]
  emptyLabel: string
  onCommentClick?: (item: FeedItem) => void
}) {
  if (items.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return items.map((item) => <FeedCard key={item.id} item={item} onCommentClick={onCommentClick} />)
}
