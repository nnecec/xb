import type {
  FeedAuthor,
  FeedDashQuality,
  FeedEmoticon,
  FeedItem,
} from '@/features/weibo/models/feed'
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
  video_title?: string
  mp4_720p_mp4?: string
  h265_mp4_hd?: string
  mpdInfo?: {
    mpdContent?: string
    mpdcontent?: string
  }
  playback_list?: Array<{
    meta?: {
      type?: number
      label?: string
      quality_index?: number | string
      quality_label?: string
      is_hidden?: boolean
    }
    play_info?: {
      type?: number
      url?: string
      protocol?: string
      label?: string
      mime?: string
      bandwidth?: number
      width?: number
      height?: number
      fps?: number
      video_codecs?: string
      audio_codecs?: string
      audio_sample_rate?: number
      sar?: string
      init_range?: string
      index_range?: string
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
  largest?: { url?: string }
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
  longText?: object
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
  like_counts?: number
  text?: string
  retweeted_status?: WeiboStatus
  analysis_extra?: string
  url_struct?: WeiboUrlStruct[]
  topic_struct?: WeiboTopicStruct[]
  isAd?: number
  attitudes_status?: boolean
  more_info?: {
    text?: string
  }
  title?: {
    text?: string
  }
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function stripUrlQuery(url: string | null | undefined): string | null {
  if (!url) return null
  return url.split('?')[0]
}

function toImagesFromParts(picIds?: string[], picInfos?: Record<string, WeiboPicInfo>) {
  if (!Array.isArray(picIds) || !picInfos) {
    return []
  }

  return picIds
    .map((picId) => {
      const info = picInfos?.[picId]
      const thumbnailUrl = info?.large?.url ?? info?.bmiddle?.url ?? info?.thumbnail?.url
      const largeUrl =
        info?.largest?.url ??
        info?.woriginal?.url ??
        info?.large?.url ??
        info?.original?.url ??
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

function getImageUrlStructs(status: Pick<WeiboStatus, 'url_struct' | 'text_raw' | 'text'>) {
  if (!Array.isArray(status.url_struct)) {
    return []
  }

  const text = status.text_raw ?? status.text ?? ''

  return status.url_struct.filter(
    (
      entity,
    ): entity is WeiboUrlStruct & {
      pic_ids: string[]
      pic_infos: Record<string, WeiboPicInfo>
    } => {
      const shortUrl = entity.short_url?.trim() ?? ''
      return (
        Array.isArray(entity.pic_ids) &&
        entity.pic_ids.length > 0 &&
        Boolean(entity.pic_infos) &&
        Boolean(shortUrl) &&
        text.includes(shortUrl)
      )
    },
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

function pickNonEmptyUrl(value?: string | null): string | undefined {
  const t = value?.trim()
  return t || undefined
}

function getMpdXml(mediaInfo: WeiboMediaInfo | undefined): string | undefined {
  const raw = mediaInfo?.mpdInfo?.mpdcontent ?? mediaInfo?.mpdInfo?.mpdContent
  const xml = typeof raw === 'string' ? raw.trim() : ''
  return xml || undefined
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function isPlaybackAudioItem(item: NonNullable<WeiboMediaInfo['playback_list']>[number]): boolean {
  const t = item.meta?.type ?? item.play_info?.type
  return t === 2
}

function isPlaybackDashItem(item: NonNullable<WeiboMediaInfo['playback_list']>[number]): boolean {
  return item.play_info?.protocol?.toLowerCase() === 'dash'
}

function bestProgressiveFromPlaybackList(mediaInfo: WeiboMediaInfo): string | undefined {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return undefined
  }

  const candidates = mediaInfo.playback_list
    .filter((item) => !isPlaybackAudioItem(item))
    .filter((item) => !isPlaybackDashItem(item))
    .map((item) => ({
      q: Number(item.meta?.quality_index ?? -1),
      url: pickNonEmptyUrl(item.play_info?.url),
    }))
    .filter((item): item is { q: number; url: string } => Boolean(item.url))

  if (candidates.length === 0) {
    return undefined
  }

  candidates.sort((a, b) => b.q - a.q)
  return candidates[0]?.url
}

function dashQualitiesFromPlaybackList(mediaInfo: WeiboMediaInfo): FeedDashQuality[] {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return []
  }

  type Row = { id: string; label: string; q: number }
  const rows: Row[] = []

  for (const item of mediaInfo.playback_list) {
    if (isPlaybackAudioItem(item) || !isPlaybackDashItem(item) || item.meta?.is_hidden) {
      continue
    }
    const id = (item.meta?.label ?? item.play_info?.label)?.trim()
    const url = pickNonEmptyUrl(item.play_info?.url)
    if (!id || !url) {
      continue
    }
    const label = (item.meta?.quality_label ?? id).trim()
    const q = Number(item.meta?.quality_index ?? -1)
    rows.push({ id, label, q })
  }

  rows.sort((a, b) => b.q - a.q)

  const seen = new Set<string>()
  const out: FeedDashQuality[] = []
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue
    }
    seen.add(row.id)
    out.push({ id: row.id, label: row.label })
  }

  return out
}

function hasAudioAdaptationInMpd(xml: string): boolean {
  return (
    /<AdaptationSet\b[^>]*\bmimeType="audio\//i.test(xml) ||
    /<AdaptationSet\b[^>]*\bcontentType="audio"/i.test(xml)
  )
}

function buildMpdFromPlaybackList(mediaInfo: WeiboMediaInfo): string | undefined {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return undefined
  }

  const dashItems = mediaInfo.playback_list.filter(
    (item) => isPlaybackDashItem(item) && pickNonEmptyUrl(item.play_info?.url),
  )
  const videoItems = dashItems.filter((item) => !isPlaybackAudioItem(item))
  const audioItems = dashItems.filter((item) => isPlaybackAudioItem(item))
  if (videoItems.length === 0 || audioItems.length === 0) {
    return undefined
  }

  const durationSec = Number((mediaInfo as { duration?: number }).duration ?? 0)
  const durationAttr = durationSec > 0 ? ` mediaPresentationDuration="PT${durationSec}S"` : ''

  const toRepresentation = (
    item: NonNullable<WeiboMediaInfo['playback_list']>[number],
    mediaType: 'video' | 'audio',
  ) => {
    const play = item.play_info ?? {}
    const id = (item.meta?.label ?? play.label ?? `${mediaType}_${item.meta?.quality_index ?? '0'}`).trim()
    const bitrate = Number(play.bandwidth ?? 0)
    const attrs = [`id="${escapeXml(id)}"`]
    if (bitrate > 0) attrs.push(`bandwidth="${bitrate}"`)
    if (mediaType === 'video') {
      if (Number(play.width ?? 0) > 0) attrs.push(`width="${Number(play.width)}"`)
      if (Number(play.height ?? 0) > 0) attrs.push(`height="${Number(play.height)}"`)
      if (Number(play.fps ?? 0) > 0) attrs.push(`frameRate="${Number(play.fps)}"`)
      if (play.video_codecs) attrs.push(`codecs="${escapeXml(play.video_codecs)}"`)
      if (play.sar) attrs.push(`sar="${escapeXml(play.sar)}"`)
    } else {
      if (Number(play.audio_sample_rate ?? 0) > 0) {
        attrs.push(`audioSamplingRate="${Number(play.audio_sample_rate)}"`)
      }
      if (play.audio_codecs) attrs.push(`codecs="${escapeXml(play.audio_codecs)}"`)
    }

    const url = escapeXml(play.url ?? '')
    const initRange = play.init_range?.trim()
    const indexRange = play.index_range?.trim()
    const segmentBase =
      initRange && indexRange
        ? `<SegmentBase indexRange="${escapeXml(indexRange)}" indexRangeExact="true"><Initialization range="${escapeXml(initRange)}" /></SegmentBase>`
        : ''

    return `<Representation ${attrs.join(' ')}><BaseURL>${url}</BaseURL>${segmentBase}</Representation>`
  }

  const videoReps = videoItems.map((item) => toRepresentation(item, 'video')).join('')
  const audioReps = audioItems.map((item) => toRepresentation(item, 'audio')).join('')

  return `<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" minBufferTime="PT2S"${durationAttr}><Period id="1" start="PT0S"><AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1">${videoReps}</AdaptationSet><AdaptationSet mimeType="audio/mp4" segmentAlignment="true" startWithSAP="1">${audioReps}</AdaptationSet></Period></MPD>`
}

function hasDashAudioInPlaybackList(mediaInfo: WeiboMediaInfo): boolean {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return false
  }
  return mediaInfo.playback_list.some(
    (item) =>
      isPlaybackDashItem(item) &&
      isPlaybackAudioItem(item) &&
      Boolean(pickNonEmptyUrl(item.play_info?.url)),
  )
}

function progressiveFallbackUrl(mediaInfo: WeiboMediaInfo): string | undefined {
  return (
    pickNonEmptyUrl(mediaInfo.mp4_720p_mp4) ??
    pickNonEmptyUrl(mediaInfo.h265_mp4_hd) ??
    bestProgressiveFromPlaybackList(mediaInfo) ??
    pickNonEmptyUrl(mediaInfo.stream_url_hd) ??
    pickNonEmptyUrl(mediaInfo.stream_url)
  )
}

export function toMedia(status: WeiboStatus) {
  const mediaInfo = status.page_info?.media_info
  if (!mediaInfo) {
    return null
  }

  const isAudio = status.page_info?.object_type === 'music'
  const progressiveUrl = progressiveFallbackUrl(mediaInfo)

  if (isAudio) {
    if (!progressiveUrl) {
      return null
    }
    return {
      type: 'audio' as const,
      streamUrl: progressiveUrl,
      title: mediaInfo.video_title ?? '',
      coverUrl: mediaInfo.big_pic_info?.pic_big?.url ?? null,
    }
  }

  const rawMpdXml = getMpdXml(mediaInfo)
  const mpdXml = rawMpdXml ?? buildMpdFromPlaybackList(mediaInfo)
  const qualities = dashQualitiesFromPlaybackList(mediaInfo)
  const hasAudioTrack = rawMpdXml ? hasAudioAdaptationInMpd(rawMpdXml) : hasDashAudioInPlaybackList(mediaInfo)
  const dash =
    mpdXml && hasAudioTrack && qualities.length > 0 ? { manifestXml: mpdXml, qualities } : undefined

  if (!progressiveUrl && !dash) {
    return null
  }

  return {
    type: 'video' as const,
    streamUrl: progressiveUrl ?? '',
    title: mediaInfo.video_title ?? '',
    coverUrl: mediaInfo.big_pic_info?.pic_big?.url ?? null,
    ...(dash ? { dash } : {}),
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
    avatarUrl: stripUrlQuery(user?.avatar_hd) ?? stripUrlQuery(user?.profile_image_url) ?? null,
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
    isLongText: Boolean(status.isLongText && !status.longText),
    liked: Boolean(status.attitudes_status),
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
    ...(status.title?.text ? { title: { text: status.title.text } } : {}),
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

  const normalizedRetweetedStatus = comment.retweeted_status
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
    likeCount: Number(comment.like_counts ?? 0),
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
    moreInfoText: comment.more_info?.text ?? undefined,
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}
