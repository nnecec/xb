import type { FeedItem } from '@/features/weibo/models/feed'

/** Where the same FeedItem-backed UI is shown (mapper input). */
export type StatusFeedSurface = 'timeline' | 'detail'

/** Role distinguishes the outer post from an embedded retweet. */
export type StatusCardRole = 'root' | 'quoted'

export interface StatusCardViewInput {
  item: FeedItem
  surface: StatusFeedSurface
  role: StatusCardRole
}

export function mapFeedItemToStatusView(
  item: FeedItem,
  surface: StatusFeedSurface,
  role: StatusCardRole,
): StatusCardViewInput {
  return { item, surface, role }
}

export function statusAllowsCardNavigate(surface: StatusFeedSurface, role: StatusCardRole): boolean {
  return role === 'root' && (surface === 'timeline' || surface === 'detail')
}
