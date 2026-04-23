import { FeedCard } from '@/lib/weibo/components/feed-card'
import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { FeedItem } from '@/lib/weibo/models/feed'

export function FeedList({
  items,
  emptyLabel,
  onNavigate,
  onCommentClick,
  onRepostClick,
}: {
  items: FeedItem[]
  emptyLabel: string
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
}) {
  if (items.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return items.map((item) => (
    <FeedCard
      key={item.id}
      item={item}
      onNavigate={onNavigate}
      onCommentClick={onCommentClick}
      onRepostClick={onRepostClick}
    />
  ))
}
