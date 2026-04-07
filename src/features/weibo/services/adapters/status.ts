import type { FeedItem } from '@/features/weibo/models/feed'
import type { StatusDetail } from '@/features/weibo/models/status'

interface StatusUser {
  avatar_hd?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

interface StatusPayloadItem {
  attitudes_count?: number
  comments_count?: number
  created_at?: string
  idstr?: string
  mid?: number | string
  reposts_count?: number
  text_raw?: string
  user?: StatusUser
}

interface StatusPayload extends StatusPayloadItem {
  comments?: StatusPayloadItem[]
}

function toFeedItem(status: StatusPayloadItem): FeedItem {
  return {
    id: String(status.idstr ?? status.mid ?? ''),
    text: status.text_raw ?? '',
    createdAtLabel: status.created_at ?? '',
    author: {
      id: String(status.user?.idstr ?? status.user?.id ?? ''),
      name: status.user?.screen_name ?? '',
      avatarUrl: status.user?.avatar_hd ?? status.user?.profile_image_url ?? null,
    },
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
  }
}

export function adaptStatusDetailResponse(payload: StatusPayload): StatusDetail {
  return {
    status: toFeedItem(payload),
    replies: Array.isArray(payload.comments) ? payload.comments.map(toFeedItem) : [],
  }
}
