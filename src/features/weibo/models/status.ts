import type { FeedItem } from '@/features/weibo/models/feed'

export interface StatusDetail {
  status: FeedItem
  replies: FeedItem[]
}
