import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'

export interface WeiboTimelineStatusUser {
  avatar_hd?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

export interface WeiboTimelineStatus {
  attitudes_count?: number
  comments_count?: number
  created_at?: string
  idstr?: string
  mid?: number | string
  raw_text?: string
  reposts_count?: number
  text_raw?: string
  user?: WeiboTimelineStatusUser
}

export interface WeiboTimelinePayload {
  data?: {
    list?: Array<WeiboTimelineStatus | null | undefined>
    statuses?: Array<WeiboTimelineStatus | null | undefined>
    since_id?: number | string
  }
  max_id?: number | string
  statuses?: Array<WeiboTimelineStatus | null | undefined>
}

function toFeedItem(status: WeiboTimelineStatus): FeedItem {
  return {
    id: String(status.idstr ?? status.mid ?? ''),
    author: {
      id: String(status.user?.idstr ?? status.user?.id ?? ''),
      name: status.user?.screen_name ?? '',
      avatarUrl: status.user?.avatar_hd ?? status.user?.profile_image_url ?? null,
    },
    text: status.text_raw ?? status.raw_text ?? '',
    createdAtLabel: status.created_at ?? '',
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
  }
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return String(value)
}

function getTimelineStatuses(payload: WeiboTimelinePayload): WeiboTimelineStatus[] {
  const statuses = Array.isArray(payload.statuses)
    ? payload.statuses
    : Array.isArray(payload.data?.statuses)
      ? payload.data.statuses
    : Array.isArray(payload.data?.list)
      ? payload.data.list
      : []

  return statuses.filter(
    (status): status is WeiboTimelineStatus => status !== null && typeof status === 'object',
  )
}

export function adaptTimelineResponse(payload: WeiboTimelinePayload): TimelinePage {
  return {
    items: getTimelineStatuses(payload)
      .map(toFeedItem)
      .filter(item => item.id !== ''),
    nextCursor: normalizeCursor(payload.max_id ?? payload.data?.since_id),
  }
}
