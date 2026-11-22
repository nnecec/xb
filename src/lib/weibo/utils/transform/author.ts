/**
 * Author transformation utilities for Weibo data.
 */

import type { FeedAuthor } from '@/lib/weibo/models/feed'
import type { WeiboStatusUser } from '@/lib/weibo/models/weibo-api'

import { stripUrlQuery } from './helpers'

/**
 * Converts Weibo user data to FeedAuthor format.
 */
export function getStatusAuthor(user: WeiboStatusUser | undefined): FeedAuthor {
  return {
    id: String(user?.idstr ?? user?.id ?? ''),
    name: user?.screen_name ?? '',
    avatarUrl: stripUrlQuery(user?.avatar_hd) ?? stripUrlQuery(user?.profile_image_url) ?? null,
  }
}
