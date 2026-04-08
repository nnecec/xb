import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentItem } from '@/features/weibo/models/status'
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
  playback_list?: Array<{
    meta?: {
      quality_index?: number | string
    }
    play_info?: {
      url?: string
    }
  }>
  author_mid?: string | number
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
  author_mid?: string | number
  media_info?: WeiboMediaInfo
  object_type?: string
}

export interface WeiboUrlStruct {
  short_url?: string
  url_title?: string
}

export interface WeiboPicInfo {
  large?: { url?: string }
  original?: { url?: string }
  thumbnail?: { url?: string }
}

export interface WeiboStatus {
  /** Numeric status id when `idstr` / `mid` omitted (some payloads). */
  id?: number | string
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
  comments?: WeiboStatus[]
  reply_comment?: WeiboStatus
  like_count?: number
  text?: string
  retweeted_status?: WeiboStatus
  analysis_extra?: string
  url_struct?: WeiboUrlStruct[]
  isAd?: number
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
  const bestPlaybackUrl = Array.isArray(mediaInfo?.playback_list)
    ? mediaInfo.playback_list
        .map(item => ({
          quality: Number(item?.meta?.quality_index ?? -1),
          url: item?.play_info?.url ?? '',
        }))
        .filter(item => Boolean(item.url))
        .sort((a, b) => b.quality - a.quality)[0]?.url
    : null
  const streamUrl = bestPlaybackUrl ?? mediaInfo?.stream_url_hd ?? mediaInfo?.stream_url
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

function pickAnalysisExtraValue(
  analysisExtra: string | undefined,
  key: string,
): string | null {
  if (!analysisExtra) {
    return null
  }
  const match = analysisExtra.match(new RegExp(`${key}:([^|]+)`))
  return match?.[1] ?? null
}

function shouldAttachMediaToRetweeted(status: WeiboStatus): boolean {
  const retweetedId = String(
    status.retweeted_status?.idstr ??
      status.retweeted_status?.mid ??
      status.retweeted_status?.id ??
      '',
  )
  if (!retweetedId) {
    return false
  }

  const mediaAuthorMid = String(
    status.page_info?.media_info?.author_mid ?? status.page_info?.author_mid ?? '',
  )
  if (mediaAuthorMid && mediaAuthorMid === retweetedId) {
    return true
  }

  const rootMid = pickAnalysisExtraValue(status.analysis_extra, 'mblog_rt_mid')
  return rootMid === retweetedId
}

function toUrlEntities(status: WeiboStatus) {
  const text = status.text_raw ?? status.text ?? ''
  if (!text || !Array.isArray(status.url_struct)) {
    return []
  }

  return status.url_struct
    .map(entity => {
      const shortUrl = entity.short_url?.trim() ?? ''
      const title = entity.url_title?.trim() ?? ''
      if (!shortUrl || !title) {
        return null
      }
      if (!text.includes(shortUrl)) {
        return null
      }
      return { shortUrl, title }
    })
    .filter((entity): entity is { shortUrl: string; title: string } => entity !== null)
}

export function toFeedItem(
  status: WeiboStatus,
  includeRetweeted = true,
): FeedItem {
  const mediaBelongsToRetweeted =
    includeRetweeted && Boolean(status.retweeted_status) && shouldAttachMediaToRetweeted(status)
  const normalizedRetweetedStatus =
    includeRetweeted && status.retweeted_status
      ? {
          ...status.retweeted_status,
          page_info:
            mediaBelongsToRetweeted && !status.retweeted_status.page_info
              ? status.page_info
              : status.retweeted_status.page_info,
          pic_ids:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.pic_ids) ||
              status.retweeted_status.pic_ids.length === 0)
              ? status.pic_ids
              : status.retweeted_status.pic_ids,
          pic_infos:
            mediaBelongsToRetweeted &&
            (!status.retweeted_status.pic_infos ||
              Object.keys(status.retweeted_status.pic_infos).length === 0)
              ? status.pic_infos
              : status.retweeted_status.pic_infos,
          url_struct:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.url_struct) ||
              status.retweeted_status.url_struct.length === 0)
              ? status.url_struct
              : status.retweeted_status.url_struct,
        }
      : null
  const urlEntities = toUrlEntities(status)

  return {
    id: String(status.idstr ?? status.mid ?? status.id ?? ''),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText),
    text: status.text_raw ?? status.raw_text ?? status.text ?? '',
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
    images: mediaBelongsToRetweeted ? [] : toImages(status),
    media: mediaBelongsToRetweeted ? null : toMedia(status),
    ...(urlEntities.length > 0 ? { urlEntities } : {}),
    regionName: status.region_name ?? '',
    source: status.source ?? '',
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}

export function toCommentItem(comment: WeiboStatus): CommentItem {
  return {
    id: String(comment.idstr ?? comment.mid ?? ''),
    text: comment.text_raw ?? comment.raw_text ?? comment.text ?? '',
    createdAtLabel: formatCreatedAt(comment.created_at ?? ''),
    author: {
      id: String(comment.user?.idstr ?? comment.user?.id ?? ''),
      name: comment.user?.screen_name ?? '',
      avatarUrl:
        comment.user?.avatar_hd ?? comment.user?.profile_image_url ?? null,
    },
    likeCount: Number(comment.like_count ?? 0),
    source: comment.source ?? '',
    replyComment: comment.reply_comment
      ? {
          id: String(
            comment.reply_comment.idstr ?? comment.reply_comment.mid ?? '',
          ),
          text:
            comment.reply_comment.text_raw ??
            comment.reply_comment.raw_text ??
            comment.reply_comment.text ??
            '',
          author: {
            id: String(
              comment.reply_comment.user?.idstr ??
                comment.reply_comment.user?.id ??
                '',
            ),
            name: comment.reply_comment.user?.screen_name ?? '',
            avatarUrl:
              comment.reply_comment.user?.avatar_hd ??
              comment.reply_comment.user?.profile_image_url ??
              null,
          },
        }
      : null,
    comments: Array.isArray(comment.comments)
      ? comment.comments.map(toCommentItem)
      : [],
  }
}
