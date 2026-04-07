import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import { formatCreatedAt } from '../utils/date'

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
  pic_infos?: Record<
    string,
    {
      large?: { url?: string }
      original?: { url?: string }
      thumbnail?: { url?: string }
    }
  >
  raw_text?: string
  reposts_count?: number
  text_raw?: string
  user?: WeiboTimelineStatusUser
  region_name?: string
  source?: string
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

function toImages(status: WeiboTimelineStatus) {
  if (!Array.isArray(status.pic_ids) || !status.pic_infos) {
    return []
  }

  return status.pic_ids
    .map(picId => {
      const info = status.pic_infos?.[picId]
      const thumbnailUrl = info?.large?.url ?? info?.thumbnail?.url
      const largeUrl = info?.original?.url ?? info?.large?.url
      if (!thumbnailUrl || !largeUrl) {
        return null
      }

      return { id: picId, thumbnailUrl, largeUrl }
    })
    .filter(
      (item): item is { id: string; thumbnailUrl: string; largeUrl: string } =>
        item !== null,
    )
}

function toMedia(status: WeiboTimelineStatus) {
  const mediaInfo = status.page_info?.media_info
  const streamUrl = mediaInfo?.stream_url_hd ?? mediaInfo?.stream_url
  if (!streamUrl) {
    return null
  }

  return {
    type:
      status.page_info?.object_type === 'music'
        ? ('audio' as const)
        : ('video' as const),
    streamUrl,
    title: mediaInfo?.name ?? '',
    coverUrl: mediaInfo?.big_pic_info?.pic_big?.url ?? null,
  }
}

function toFeedItem(status: WeiboTimelineStatus): FeedItem {
  return {
    id: String(status.idstr ?? status.mid ?? ''),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText),
    author: {
      id: String(status.user?.idstr ?? status.user?.id ?? ''),
      name: status.user?.screen_name ?? '',
      avatarUrl:
        status.user?.avatar_hd ?? status.user?.profile_image_url ?? null,
    },
    regionName: status.region_name ?? '',
    source: status.source ?? '',
    text: status.text_raw ?? status.raw_text ?? '',
    createdAtLabel: formatCreatedAt(status.created_at ?? ''),
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
    images: toImages(status),
    media: toMedia(status),
  }
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return String(value)
}

function getTimelineStatuses(
  payload: WeiboTimelinePayload,
): WeiboTimelineStatus[] {
  const statuses = Array.isArray(payload.statuses)
    ? payload.statuses
    : Array.isArray(payload.data?.statuses)
      ? payload.data.statuses
      : Array.isArray(payload.data?.list)
        ? payload.data.list
        : []
  console.log('🚀 ~ getTimelineStatuses ~ statuses:', statuses)

  return statuses.filter(
    (status): status is WeiboTimelineStatus =>
      status !== null && typeof status === 'object',
  )
}

export function adaptTimelineResponse(
  payload: WeiboTimelinePayload,
): TimelinePage {
  return {
    items: getTimelineStatuses(payload)
      .map(toFeedItem)
      .filter(item => item.id !== ''),
    nextCursor: normalizeCursor(payload.max_id ?? payload.data?.since_id),
  }
}
