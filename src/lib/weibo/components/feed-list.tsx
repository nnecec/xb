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

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} data-feed-id={item.id}>
          <FeedCard
            item={item}
            onNavigate={onNavigate}
            onCommentClick={onCommentClick}
            onRepostClick={onRepostClick}
          />
        </div>
      ))}
    </div>
  )
}
