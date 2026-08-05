import type { TimelinePage, TopicChannel, TopicHeadData } from '@/lib/weibo/models/feed'
import { mweiboFetch } from '@/lib/weibo/services/m-weibo-client'
import {
  MweiboCaptchaError,
  MweiboUnavailableError,
  type MweiboUnavailableReason,
} from '@/lib/weibo/services/mweibo-errors'
import {
  type WeiboPicInfo,
  type WeiboPageInfo,
  type WeiboStatus,
  type WeiboStatusUser,
  toFeedItem,
} from '@/lib/weibo/utils/transform'

// ─── m.weibo.cn payload types ────────────────────────────────────────────────

interface MweiboUser {
  id: number
  screen_name?: string
  profile_image_url?: string
  avatar_hd?: string
  verified?: boolean
  verified_type?: number
  followers_count?: string | number
  follow_count?: number
  statuses_count?: number
  description?: string
  gender?: string
}

interface MweiboPageInfo {
  type?: 'video' | 'search_topic' | string
  object_type?: number
  page_pic?: {
    url?: string
    width?: string
    height?: string
  }
  page_url?: string
  media_info?: {
    stream_url?: string
    stream_url_hd?: string
    duration?: number
    mp4_720p_mp4?: string
    mp4_hd_mp4?: string
    mp4_ld_mp4?: string
  }
  urls?: Record<string, string>
  video_orientation?: string
  title?: string
  content1?: string
  content2?: string
}

interface MweiboMblog {
  id: number | string
  bid?: string
  text?: string
  textLength?: number
  isLongText?: boolean
  attitudes_count?: number
  comments_count?: number
  reposts_count?: number
  created_at?: string
  source?: string
  region_name?: string
  favorited?: boolean
  attitudes_status?: boolean
  user?: MweiboUser
  pic_ids?: string[]
  pic_infos?: Record<string, WeiboPicInfo>
  page_info?: MweiboPageInfo
  retweeted_status?: MweiboMblog
  isAd?: number
  title?: { text?: string }
  mix_media_info?: { items: Array<unknown> }
  pics?: Array<{
    pid: string
    url: string
    size?: string
    large?: { size?: string; url: string }
  }>
}

interface MweiboCard {
  card_type: number
  mblog?: MweiboMblog
  card_group?: MweiboCard[]
}

interface MweiboCardlistInfo {
  total?: number
  page?: number
  page_size?: number | string
  containerid?: string
  cardlist_title?: string
  cardlist_head_cards?: MweiboHeadCard[]
}

interface MweiboCardlistChannel {
  id: string
  name: string
  containerid?: string
}

interface MweiboHeadData {
  bg_img?: string
  portrait_url?: string
  title?: string
  midtext?: string
  downtext?: string
  theme_background_color?: string
}

interface MweiboHeadCard {
  head_type: number
  head_type_name?: string
  head_data?: MweiboHeadData
  channel_list?: MweiboCardlistChannel[]
}

interface MweiboTopicData {
  cardlistInfo: MweiboCardlistInfo
  cards: MweiboCard[]
}

interface MweiboTopicPayload {
  ok?: number
  data?: MweiboTopicData
}

// ─── Transform helpers ──────────────────────────────────────────────────────────

function stripHtmlTags(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function stripTopicLongTextPreviewLabel(text: string): string {
  return text.replace(/((?:\.{3}|…|⋯)\s*)(?:<a\b[^>]*>\s*)?全文\s*(?:<\/a>)?\s*$/i, '$1').trimEnd()
}

function convertPicsToPicInfos(
  pics: MweiboMblog['pics'],
): { pic_ids: string[]; pic_infos: Record<string, WeiboPicInfo> } | null {
  if (!pics || pics.length === 0) return null
  const picIds: string[] = []
  const picInfos: Record<string, WeiboPicInfo> = {}
  for (const p of pics) {
    picIds.push(p.pid)
    picInfos[p.pid] = {
      thumbnail: { url: p.url },
      large: { url: p.large?.url ?? p.url },
    }
  }
  return { pic_ids: picIds, pic_infos: picInfos }
}

function mweiboUserToWeiboStatusUser(user: MweiboUser | undefined): WeiboStatusUser | undefined {
  if (!user) return undefined
  return {
    id: user.id,
    idstr: String(user.id),
    screen_name: user.screen_name,
    profile_image_url: user.profile_image_url,
    avatar_hd: user.avatar_hd ?? user.profile_image_url?.replace('/crop\\..+?/', '/orj480/'),
  }
}

function mweiboPageInfoToWeiboPageInfo(
  pageInfo: MweiboPageInfo | undefined,
): WeiboPageInfo | undefined {
  if (!pageInfo) return undefined
  // Map `type` field (e.g. "video") to object_type so toMedia detects video correctly.
  // m.weibo.cn uses `type: "video"` while weibo.com uses `object_type: "video"`.
  const objectType = pageInfo.type === 'video' ? 'video' : String(pageInfo.object_type ?? '')
  return {
    object_type: objectType,
    page_pic: pageInfo.page_pic?.url,
    media_info: pageInfo.media_info
      ? {
          stream_url: pageInfo.media_info.stream_url,
          stream_url_hd: pageInfo.media_info.stream_url_hd ?? pageInfo.media_info.stream_url,
          video_orientation:
            pageInfo.video_orientation === 'vertical'
              ? 'vertical'
              : pageInfo.video_orientation === 'horizontal'
                ? 'horizontal'
                : undefined,
          mp4_720p_mp4: pageInfo.media_info.mp4_720p_mp4,
          mp4_hd_url: pageInfo.media_info.mp4_hd_mp4,
        }
      : undefined,
  }
}

function mweiboMblogToWeiboStatus(mblog: MweiboMblog): WeiboStatus {
  const text = mblog.text ?? ''
  const displayText = mblog.isLongText ? stripTopicLongTextPreviewLabel(text) : text

  return {
    id: String(mblog.id),
    idstr: String(mblog.id),
    mid: String(mblog.id),
    mblogid: mblog.bid ?? String(mblog.id),
    text: displayText,
    text_raw: displayText ? stripHtmlTags(displayText) : '',
    created_at: mblog.created_at,
    source: mblog.source,
    region_name: mblog.region_name,
    favorited: mblog.favorited,
    attitudes_status: mblog.attitudes_status,
    attitudes_count: mblog.attitudes_count,
    comments_count: mblog.comments_count,
    reposts_count: mblog.reposts_count,
    isLongText: mblog.isLongText,
    isAd: mblog.isAd,
    pic_ids: mblog.pic_ids ?? convertPicsToPicInfos(mblog.pics)?.pic_ids,
    pic_infos: mblog.pic_infos ?? convertPicsToPicInfos(mblog.pics)?.pic_infos,
    page_info: mweiboPageInfoToWeiboPageInfo(mblog.page_info),
    user: mweiboUserToWeiboStatusUser(mblog.user),
    title: mblog.title,
    retweeted_status: mblog.retweeted_status
      ? (mweiboMblogToWeiboStatus(mblog.retweeted_status) as WeiboStatus['retweeted_status'])
      : undefined,
  }
}

// ─── Adapter ─────────────────────────────────────────────────────────────────────

function adaptMweiboTopicPayload(
  payload: MweiboTopicPayload | null | undefined,
  page: number = 1,
): TimelinePage | null {
  if (
    payload?.ok !== 1 ||
    !payload.data ||
    !Array.isArray(payload.data.cards) ||
    !payload.data.cardlistInfo
  ) {
    return null
  }

  const { cards, cardlistInfo } = payload.data

  // Flatten cards: card_type 9 directly, card_type 11 extracted from card_group
  const allCards: MweiboCard[] = []
  for (const card of cards) {
    if (card.card_type === 9) {
      allCards.push(card)
    } else if (card.card_type === 11 && Array.isArray(card.card_group)) {
      for (const sub of card.card_group) {
        if (sub.card_type === 9) {
          allCards.push(sub)
        }
      }
    }
  }

  const items = allCards
    .filter((card) => card.mblog && card.mblog.isAd !== 1)
    .map((card) => toFeedItem(mweiboMblogToWeiboStatus(card.mblog!)))
    .filter((item) => item.id !== '')

  const total = Number(cardlistInfo.total ?? 0)
  const pageSize = Number(cardlistInfo.page_size ?? 10)
  const currentPage = cardlistInfo.page ?? page
  const hasMore = total > currentPage * pageSize

  // Extract channels from cardlist_head_cards (head_type === 0)
  let channels: TopicChannel[] | undefined
  let headData: TopicHeadData | null | undefined

  const headCards = cardlistInfo.cardlist_head_cards
  if (Array.isArray(headCards)) {
    for (const headCard of headCards) {
      if (headCard.head_type === 0 && Array.isArray(headCard.channel_list)) {
        channels = headCard.channel_list.map((ch) => ({
          id: ch.id,
          name: ch.name,
        }))
      }
      if (headCard.head_type === 1 && headCard.head_data) {
        const hd = headCard.head_data
        headData = {
          bgImgUrl: hd.bg_img ?? hd.portrait_url ?? null,
          title: hd.title ?? '',
          midtext: hd.midtext ?? '',
          downtext: hd.downtext ?? '',
          themeBackgroundColor: hd.theme_background_color ?? null,
        }
      }
    }
  }

  return {
    items,
    nextCursor: hasMore ? String(currentPage + 1) : null,
    ...(channels && channels.length > 0 ? { channels } : {}),
    ...(headData !== undefined ? { headData } : {}),
  }
}

export interface MweiboTopicRecoveryState {
  kind: 'captcha' | 'unavailable'
  originalTopicUrl: string
  reason?: MweiboUnavailableReason
}

class MweiboTopicDeliveryError extends Error {
  readonly kind = 'mweibo-topic-recovery' as const

  constructor(readonly recovery: MweiboTopicRecoveryState) {
    super('m.weibo.cn 暂时没有返回可用的话题内容')
    this.name = 'MweiboTopicDeliveryError'
  }
}

function buildTopicContainerId(topic: string, channelType?: string) {
  return `231522type=${channelType ?? '1'}&q=#${topic}#`
}

function buildTopicSearchUrl(topic: string, page: number, channelType?: string) {
  const params = new URLSearchParams({
    containerid: buildTopicContainerId(topic, channelType),
    page_type: 'searchall',
    v_p: '42',
    page: String(page),
  })
  return `https://m.weibo.cn/api/container/getIndex?${params}`
}

function buildMweiboTopicPageUrl(topic: string, channelType?: string) {
  const params = new URLSearchParams({
    containerid: buildTopicContainerId(topic, channelType),
    v_p: '42',
  })
  return `https://m.weibo.cn/search?${params}`
}

function recoveryError(
  topic: string,
  channelType: string | undefined,
  recovery: Omit<MweiboTopicRecoveryState, 'originalTopicUrl'>,
) {
  return new MweiboTopicDeliveryError({
    ...recovery,
    originalTopicUrl: buildMweiboTopicPageUrl(topic, channelType),
  })
}

export function getMweiboTopicRecoveryState(error: unknown): MweiboTopicRecoveryState | null {
  if (!error || typeof error !== 'object') return null
  const candidate = error as Record<string, unknown>
  if (candidate.kind !== 'mweibo-topic-recovery') return null
  const recovery = candidate.recovery
  if (!recovery || typeof recovery !== 'object') return null
  const state = recovery as Record<string, unknown>
  if (state.kind !== 'captcha' && state.kind !== 'unavailable') return null
  if (typeof state.originalTopicUrl !== 'string') return null
  return recovery as MweiboTopicRecoveryState
}

export async function deliverMweiboTopicPage(
  topic: string,
  page: number,
  channelType?: string,
): Promise<TimelinePage> {
  try {
    const payload = await mweiboFetch<MweiboTopicPayload>(
      buildTopicSearchUrl(topic, page, channelType),
    )
    const timelinePage = adaptMweiboTopicPayload(payload, page)
    if (timelinePage) return timelinePage
    throw recoveryError(topic, channelType, { kind: 'unavailable', reason: 'business' })
  } catch (error) {
    if (getMweiboTopicRecoveryState(error)) throw error
    if (error instanceof MweiboCaptchaError) {
      throw recoveryError(topic, channelType, { kind: 'captcha' })
    }
    if (error instanceof MweiboUnavailableError) {
      throw recoveryError(topic, channelType, {
        kind: 'unavailable',
        reason: error.reason,
      })
    }
    throw error
  }
}
