import type { FeedAuthor, FeedEmoticon, FeedItem } from '@/features/weibo/models/feed'
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
  url_type?: number | string
  short_url?: string
  url_title?: string
  long_url?: string
  ori_url?: string
  h5_target_url?: string
  pic_ids?: string[]
  pic_infos?: Record<string, WeiboPicInfo>
}

export interface WeiboTopicStruct {
  topic_title?: string
}

export interface WeiboPicInfo {
  bmiddle?: { url?: string }
  large?: { url?: string }
  original?: { url?: string }
  woriginal?: { url?: string }
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
  topic_struct?: WeiboTopicStruct[]
  isAd?: number
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function toImagesFromParts(picIds?: string[], picInfos?: Record<string, WeiboPicInfo>) {
  if (!Array.isArray(picIds) || !picInfos) {
    return []
  }

  return picIds
    .map((picId) => {
      const info = picInfos?.[picId]
      const thumbnailUrl = info?.large?.url ?? info?.bmiddle?.url ?? info?.thumbnail?.url
      const largeUrl =
        info?.woriginal?.url ??
        info?.original?.url ??
        info?.large?.url ??
        info?.bmiddle?.url ??
        info?.thumbnail?.url
      if (!thumbnailUrl || !largeUrl) {
        return null
      }

      return { id: picId, thumbnailUrl, largeUrl }
    })
    .filter((item): item is { id: string; thumbnailUrl: string; largeUrl: string } => item !== null)
}

export function toImages(status: WeiboStatus) {
  return toImagesFromParts(status.pic_ids, status.pic_infos)
}

function getImageUrlStructs(status: Pick<WeiboStatus, 'url_struct'>) {
  if (!Array.isArray(status.url_struct)) {
    return []
  }

  return status.url_struct.filter(
    (entity): entity is WeiboUrlStruct & { pic_ids: string[]; pic_infos: Record<string, WeiboPicInfo> } =>
      Array.isArray(entity.pic_ids) && entity.pic_ids.length > 0 && Boolean(entity.pic_infos),
  )
}

function toCommentImages(status: WeiboStatus) {
  const directImages = toImages(status)
  if (directImages.length > 0) {
    return directImages
  }

  const seen = new Set<string>()
  return getImageUrlStructs(status)
    .flatMap((entity) => toImagesFromParts(entity.pic_ids, entity.pic_infos))
    .filter((image) => {
      if (seen.has(image.id)) {
        return false
      }
      seen.add(image.id)
      return true
    })
}

function stripEntityTokens(text: string, tokens: string[]) {
  return tokens
    .reduce((result, token) => {
      return result.replaceAll(token, '').replace(/[ \t]{2,}/g, ' ')
    }, text)
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim()
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
}

function extractEmoticonsFromHtml(html: string | undefined): Record<string, FeedEmoticon> {
  if (!html) {
    return {}
  }

  const emoticons: Record<string, FeedEmoticon> = {}
  const imagePattern =
    /<img\b[^>]*\balt="(\[[^"\]]+\])"[^>]*\bsrc="([^"]+)"[^>]*>|<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="(\[[^"\]]+\])"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = imagePattern.exec(html)) !== null) {
    const phrase = decodeHtmlEntities((match[1] ?? match[4] ?? '').trim())
    const url = decodeHtmlEntities((match[2] ?? match[3] ?? '').trim())
    if (!phrase || !url) {
      continue
    }

    emoticons[phrase] = { phrase, url }
  }

  return emoticons
}

export function toMedia(status: WeiboStatus) {
  const mediaInfo = status.page_info?.media_info
  const bestPlaybackUrl = Array.isArray(mediaInfo?.playback_list)
    ? mediaInfo.playback_list
        .map((item) => ({
          quality: Number(item?.meta?.quality_index ?? -1),
          url: item?.play_info?.url ?? '',
        }))
        .filter((item) => Boolean(item.url))
        .sort((a, b) => b.quality - a.quality)[0]?.url
    : null
  const streamUrl = bestPlaybackUrl ?? mediaInfo?.stream_url_hd ?? mediaInfo?.stream_url
  if (!streamUrl) {
    return null
  }

  return {
    type: status.page_info?.object_type === 'music' ? ('audio' as const) : ('video' as const),
    streamUrl,
    title: mediaInfo?.name ?? '',
    coverUrl: mediaInfo?.big_pic_info?.pic_big?.url ?? null,
  }
}

function pickAnalysisExtraValue(analysisExtra: string | undefined, key: string): string | null {
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

function toUrlEntities(status: WeiboStatus, options?: { excludeImageEntities?: boolean }) {
  const text = status.text_raw ?? status.text ?? ''
  if (!text || !Array.isArray(status.url_struct)) {
    return []
  }

  return status.url_struct
    .map((entity) => {
      const shortUrl = entity.short_url?.trim() ?? ''
      const title = entity.url_title?.trim() ?? ''
      const rawUrlType = entity.url_type
      const hasUrlType =
        rawUrlType !== undefined && rawUrlType !== null && String(rawUrlType).trim() !== ''
      const isImageEntity = Array.isArray(entity.pic_ids) && entity.pic_ids.length > 0
      const targetUrl =
        entity.h5_target_url?.trim() ??
        entity.long_url?.trim() ??
        entity.ori_url?.trim() ??
        shortUrl
      if (!shortUrl || !title || !targetUrl || !hasUrlType) {
        return null
      }
      if (options?.excludeImageEntities && isImageEntity) {
        return null
      }
      if (!text.includes(shortUrl)) {
        return null
      }
      return { shortUrl, title, url: targetUrl }
    })
    .filter((entity): entity is { shortUrl: string; title: string; url: string } => entity !== null)
}

function toTopicEntities(status: WeiboStatus) {
  const text = getStatusText(status)
  if (!text || !Array.isArray(status.topic_struct)) {
    return []
  }

  return status.topic_struct
    .map((entity) => {
      const title = entity.topic_title?.trim() ?? ''
      if (!title) {
        return null
      }

      const token = `#${title}#`
      if (!text.includes(token)) {
        return null
      }

      return {
        title,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(token)}`,
      }
    })
    .filter((entity): entity is { title: string; url: string } => entity !== null)
}

function getStatusId(status: Pick<WeiboStatus, 'idstr' | 'mid' | 'id'>): string {
  return String(status.idstr ?? status.mid ?? status.id ?? '')
}

function getStatusText(status: Pick<WeiboStatus, 'text_raw' | 'raw_text' | 'text'>): string {
  return status.text_raw ?? status.raw_text ?? status.text ?? ''
}

function getStatusAuthor(user: WeiboStatusUser | undefined): FeedAuthor {
  return {
    id: String(user?.idstr ?? user?.id ?? ''),
    name: user?.screen_name ?? '',
    avatarUrl: user?.avatar_hd ?? user?.profile_image_url ?? null,
  }
}

export function toFeedItem(status: WeiboStatus, includeRetweeted = true): FeedItem {
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
          topic_struct:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.topic_struct) ||
              status.retweeted_status.topic_struct.length === 0)
              ? status.topic_struct
              : status.retweeted_status.topic_struct,
        }
      : null
  const urlEntities = toUrlEntities(status)
  const topicEntities = toTopicEntities(status)
  const emoticons = extractEmoticonsFromHtml(status.text)

  return {
    id: getStatusId(status),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText),
    text: getStatusText(status),
    createdAtLabel: formatCreatedAt(status.created_at ?? ''),
    author: getStatusAuthor(status.user),
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
    images: mediaBelongsToRetweeted ? [] : toImages(status),
    media: mediaBelongsToRetweeted ? null : toMedia(status),
    ...(Object.keys(emoticons).length > 0 ? { emoticons } : {}),
    ...(urlEntities.length > 0 ? { urlEntities } : {}),
    ...(topicEntities.length > 0 ? { topicEntities } : {}),
    regionName: status.region_name ?? '',
    source: stripHtmlTags(status.source ?? ''),
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}

export function toCommentItem(comment: WeiboStatus): CommentItem {
  const commentImageTokens = getImageUrlStructs(comment)
    .map((entity) => entity.short_url?.trim() ?? '')
    .filter(Boolean)
  const urlEntities = toUrlEntities(comment, { excludeImageEntities: true })
  const images = toCommentImages(comment)
  const normalizedCommentText = stripEntityTokens(getStatusText(comment), commentImageTokens)
  const replyCommentText = getStatusText(comment.reply_comment ?? {})
  const replyCommentImageTokens = getImageUrlStructs(comment.reply_comment ?? {})
    .map((entity) => entity.short_url?.trim() ?? '')
    .filter(Boolean)
  const normalizedReplyCommentText = stripEntityTokens(replyCommentText, replyCommentImageTokens)
  const emoticons = extractEmoticonsFromHtml(comment.text)

  const normalizedRetweetedStatus =
    comment.retweeted_status
      ? {
          ...comment.retweeted_status,
          pic_ids: comment.retweeted_status.pic_ids ?? [],
          pic_infos: comment.retweeted_status.pic_infos ?? {},
          url_struct: comment.retweeted_status.url_struct ?? [],
          topic_struct: comment.retweeted_status.topic_struct ?? [],
        }
      : null

  return {
    id: getStatusId(comment),
    text: normalizedCommentText,
    createdAtLabel: formatCreatedAt(comment.created_at ?? ''),
    author: getStatusAuthor(comment.user),
    likeCount: Number(comment.like_count ?? 0),
    source: stripHtmlTags(comment.source ?? ''),
    ...(Object.keys(emoticons).length > 0 ? { emoticons } : {}),
    ...(urlEntities.length > 0 ? { urlEntities } : {}),
    images,
    replyComment: comment.reply_comment
      ? {
          id: getStatusId(comment.reply_comment),
          text: normalizedReplyCommentText,
          author: getStatusAuthor(comment.reply_comment.user),
          ...(Object.keys(extractEmoticonsFromHtml(comment.reply_comment.text)).length > 0
            ? { emoticons: extractEmoticonsFromHtml(comment.reply_comment.text) }
            : {}),
          images: toCommentImages(comment.reply_comment),
          ...(toUrlEntities(comment.reply_comment, { excludeImageEntities: true }).length > 0
            ? { urlEntities: toUrlEntities(comment.reply_comment, { excludeImageEntities: true }) }
            : {}),
        }
      : null,
    comments: Array.isArray(comment.comments) ? comment.comments.map(toCommentItem) : [],
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}
