import type { FeedItem } from '@/features/weibo/models/feed'

export interface StatusCommentsPage {
  items: FeedItem[]
  nextCursor: string | null
}

export interface StatusDetail {
  status: FeedItem
}
