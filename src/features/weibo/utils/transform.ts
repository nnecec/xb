import type { FeedItem } from '@/features/weibo/models/feed'
import { formatCreatedAt } from '../services/utils/date'

// ─── Shared payload types ────────────────────────────────────────────────────

export interface WeiboStatusUser {
  avatar_hd?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

export interface WeiboMediaInfo {
  big_pic_info?: {
    pic_big?: {
      url?: string
    }
  }
  name?: string
  stream_url?: string
  stream_url_hd?: string
}

export interface WeiboPageInfo {
  media_info?: WeiboMediaInfo
  object_type?: string
}

export interface WeiboPicInfo {
  large?: { url?: string }
  original?: { url?: string }
  thumbnail?: { url?: string }
}

export interface WeiboStatus {
  attitudes_count?: number
  comments_count?: number
  created_at?: string
  idstr?: string
  isLongText?: boolean
  mid?: number | string
  mblogid?: string
  page_info?: WeiboPageInfo
  pic_ids?: string[]
  pic_infos?: Record<string, WeiboPicInfo>
  raw_text?: string
  reposts_count?: number
  text_raw?: string
  user?: WeiboStatusUser
  region_name?: string
  source?: string
}

// ─── Transform helpers ────────────────────────────────────────────────────────

export function toImages(status: WeiboStatus) {
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

export function toMedia(status: WeiboStatus) {
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

export function toFeedItem(status: WeiboStatus): FeedItem {
  return {
    id: String(status.idstr ?? status.mid ?? ''),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText),
    text: status.text_raw ?? status.raw_text ?? '',
    createdAtLabel: formatCreatedAt(status.created_at ?? ''),
    author: {
      id: String(status.user?.idstr ?? status.user?.id ?? ''),
      name: status.user?.screen_name ?? '',
      avatarUrl:
        status.user?.avatar_hd ?? status.user?.profile_image_url ?? null,
    },
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
    images: toImages(status),
    media: toMedia(status),
    regionName: status.region_name ?? '',
    source: status.source ?? '',
  }
}
