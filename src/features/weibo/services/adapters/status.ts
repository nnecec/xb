import type { FeedItem } from '@/features/weibo/models/feed'
import type { StatusCommentsPage, StatusDetail } from '@/features/weibo/models/status'
import { formatCreatedAt } from '../utils/date'

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
  isLongText?: boolean
  mid?: number | string
  mblogid?: string
  page_info?: {
    media_info?: {
      big_pic_info?: {
        pic_big?: {
          url?: string
        }
      }
      name?: string
      stream_url?: string
      stream_url_hd?: string
    }
    object_type?: string
  }
  pic_ids?: string[]
  pic_infos?: Record<string, {
    large?: { url?: string }
    original?: { url?: string }
    thumbnail?: { url?: string }
  }>
  reposts_count?: number
  text_raw?: string
  user?: StatusUser
}

interface StatusPayload extends StatusPayloadItem {
  comments?: StatusPayloadItem[] // old shape
}

interface StatusCommentsPayload {
  data?: StatusPayloadItem[]
  max_id?: string | number
}

function toImages(status: StatusPayloadItem) {
  if (!Array.isArray(status.pic_ids) || !status.pic_infos) {
    return []
  }

  return status.pic_ids
    .map((picId) => {
      const info = status.pic_infos?.[picId]
      const thumbnailUrl = info?.large?.url ?? info?.thumbnail?.url
      const largeUrl = info?.original?.url ?? info?.large?.url
      if (!thumbnailUrl || !largeUrl) {
        return null
      }

      return { id: picId, thumbnailUrl, largeUrl }
    })
    .filter((item): item is { id: string, thumbnailUrl: string, largeUrl: string } => item !== null)
}

function toMedia(status: StatusPayloadItem) {
  const mediaInfo = status.page_info?.media_info
  const streamUrl = mediaInfo?.stream_url_hd ?? mediaInfo?.stream_url
  if (!streamUrl) {
    return null
  }

  return {
    type: status.page_info?.object_type === 'music' ? 'audio' as const : 'video' as const,
    streamUrl,
    title: mediaInfo?.name ?? '',
    coverUrl: mediaInfo?.big_pic_info?.pic_big?.url ?? null,
  }
}

function normalizeCursor(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }
  return String(value)
}

function toFeedItem(status: StatusPayloadItem): FeedItem {
  return {
    id: String(status.idstr ?? status.mid ?? ''),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText),
    text: status.text_raw ?? '',
    createdAtLabel: formatCreatedAt(status.created_at ?? ''),
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
    images: toImages(status),
    media: toMedia(status),
  }
}

export function adaptStatusDetailResponse(payload: StatusPayload): StatusDetail {
  return {
    status: toFeedItem(payload),
  }
}

export function adaptStatusCommentsResponse(payload: StatusCommentsPayload): StatusCommentsPage {
  return {
    items: Array.isArray(payload.data) ? payload.data.map(toFeedItem) : [],
    nextCursor: normalizeCursor(payload.max_id),
  }
}
