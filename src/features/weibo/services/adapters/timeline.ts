import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'

interface TimelineStatusUser {
  avatar_hd?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

interface TimelineStatus {
  attitudes_count?: number
  comments_count?: number
  created_at?: string
  idstr?: string
  mid?: number | string
  raw_text?: string
  reposts_count?: number
  text_raw?: string
  user?: TimelineStatusUser
}

interface TimelinePayload {
  data?: {
    list?: TimelineStatus[]
    since_id?: number | string
  }
  max_id?: number | string
  statuses?: TimelineStatus[]
}

function toFeedItem(status: TimelineStatus): FeedItem {
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

export function adaptTimelineResponse(payload: TimelinePayload): TimelinePage {
  const statuses = Array.isArray(payload.statuses)
    ? payload.statuses
    : Array.isArray(payload.data?.list)
      ? payload.data.list
      : []

  return {
    items: statuses.map(toFeedItem),
    nextCursor: normalizeCursor(payload.max_id ?? payload.data?.since_id),
  }
}
