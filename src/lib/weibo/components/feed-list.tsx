import { useElementSize } from '@reactuses/core'
import { useRef } from 'react'

import { useAppSettings } from '@/lib/app-settings-store'
import { FeedCard } from '@/lib/weibo/components/feed-card'
import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { FeedItem } from '@/lib/weibo/models/feed'

type ProfileLookup = { uid: string } | { screenName: string }

const MIN_CARD_WIDTH = 300

export function FeedList({
  items,
  emptyLabel,
  onNavigate,
  onCommentClick,
  onRepostClick,
  onNavigateProfile,
}: {
  items: FeedItem[]
  emptyLabel: string
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onNavigateProfile?: (lookup: ProfileLookup) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth] = useElementSize(containerRef)
  const waterfallColumnCount = useAppSettings((s) => s.waterfallColumnCount)

  if (items.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  const effectiveColumnCount =
    waterfallColumnCount > 1 && containerWidth > 0
      ? Math.min(waterfallColumnCount, Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH)))
      : 1

  if (effectiveColumnCount <= 1) {
    return (
      <div ref={containerRef}>
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onNavigate={onNavigate}
              onCommentClick={onCommentClick}
              onRepostClick={onRepostClick}
              onNavigateProfile={onNavigateProfile}
            />
          ))}
        </div>
      </div>
    )
  }

  const gap = 16
  const cardWidth = (containerWidth - gap * (effectiveColumnCount - 1)) / effectiveColumnCount

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap items-stretch gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col" style={{ width: cardWidth }}>
            <FeedCard
              item={item}
              onNavigate={onNavigate}
              onCommentClick={onCommentClick}
              onRepostClick={onRepostClick}
              onNavigateProfile={onNavigateProfile}
              uniformHeight
            />
          </div>
        ))}
      </div>
    </div>
  )
}
