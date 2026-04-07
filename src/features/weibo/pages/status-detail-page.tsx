import type { StatusDetail } from '@/features/weibo/models/status'

import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'

export function StatusDetailPage({ detail }: { detail: StatusDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <FeedCard item={detail.status} />
      {detail.replies.length > 0
        ? detail.replies.map((reply) => <FeedCard key={reply.id} item={reply} />)
        : <PageEmptyState label="No replies are available for this post yet." />}
    </div>
  )
}
