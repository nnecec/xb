import type { HotSearchType } from '@/lib/app-settings'

interface HotSearchItem {
  type: HotSearchType
  word: string
  num: number
  realpos: number
  labelName: string
  icon: string | null
  iconDesc: string
  iconDescColor: string
  topicFlag: number
  is_ad?: number
}

export interface HotSearchPayload {
  data?: {
    realtime?: HotSearchItem[]
  }
}

export interface HotSearchPage {
  items: HotSearchItem[]
}

// 我的热搜 (mineBand) 类型
interface MineBandItem {
  word: string
  word_scheme: string
  icon_url: string
  icon_desc: string
  icon_desc_color: string
  small_icon_desc: string
  small_icon_desc_color: string
  rank: number
  topic_flag: number
  description: string
}

export interface MineBandPayload {
  data?: {
    realtime?: MineBandItem[]
    detailPath?: string
  }
}

// 文娱热搜 (entertainmentBand) 类型
interface EntertainmentBandItem {
  icon_desc: string
  muse_mark: string
  icon_desc_color: string
  hot_num: number
  small_icon_desc: string
  small_icon_desc_color: string
  mid: string
  grade: string
  scene_flag: number
  note: string
  ever_in_board: string
  cooperate: number
  main_board_flag: number
  onboard_time: number
  channel_type: string
  topic_flag: number
  word_scheme: string
  star_name: Record<string, unknown>
  word: string
  flag: number
  co_info: Record<string, unknown>
  loc_page: number
  out_index: number
  is_new: number
  display_flag: string
  emoticon: string
  category: string
  subject_querys: Record<string, unknown>
  imp_support: number
  on_main_board_time: number
  expand: number
  num: number
  hot_rank_position: number
  topic_image: string
  manual_grade: string
  realpos: number
  imp_support_time: number
}

export interface EntertainmentBandPayload {
  data?: {
    band_list?: EntertainmentBandItem[]
  }
}

// 生活热搜 (lifeBand) 类型
interface LifeBandItem {
  icon_desc: string
  icon_desc_color: string
  icon: string
  icon_width: number
  icon_height: number
  is_hot: number
  num: number
  note: string
  loc_page: number
  small_icon_desc: string
  small_icon_desc_color: string
  word_scheme: string
  m_category: string
  topic_flag: number
  emoticon: string
  flag: number
  word: string
}

export interface LifeBandPayload {
  data?: {
    band_list?: LifeBandItem[]
  }
}

// 社会热搜 (socialBand) 类型
interface SocialBandItem {
  loc_page: number
  topic_flag: number
  word_scheme: string
  m_category: string
  num: number
  flag: number
  emoticon: string
  note: string
  word: string
  rank: number
}

export interface SocialBandPayload {
  data?: {
    band_list?: SocialBandItem[]
  }
}

// 统一的热搜项类型（用于渲染）
export interface UnifiedHotSearchItem {
  type: HotSearchType
  word: string
  num: number
  realpos: number
  labelName: string
  icon: string | null
  iconDesc: string
  iconDescColor: string
  topicFlag: number
}

// 我的热搜适配器
export function adaptMineBandResponse(
  payload: MineBandPayload,
  type: HotSearchType = 'mine',
): UnifiedHotSearchItem[] {
  const realtime = payload.data?.realtime ?? []
  return realtime.map((item) => ({
    type,
    word: item.word,
    num: 0,
    realpos: item.rank,
    labelName: item.icon_desc || item.small_icon_desc || '',
    icon: item.icon_url || null,
    iconDesc: item.icon_desc || '',
    iconDescColor: item.icon_desc_color || '',
    topicFlag: item.topic_flag,
  }))
}

// 文娱热搜适配器
export function adaptEntertainmentBandResponse(
  payload: EntertainmentBandPayload,
  type: HotSearchType = 'entertainment',
): UnifiedHotSearchItem[] {
  const bandList = payload.data?.band_list ?? []
  return bandList.map((item) => ({
    type,
    word: item.word,
    num: item.hot_num || item.num || 0,
    realpos: item.realpos || item.hot_rank_position || 0,
    labelName: item.icon_desc || item.small_icon_desc || '',
    icon: null,
    iconDesc: item.icon_desc || '',
    iconDescColor: item.icon_desc_color || '',
    topicFlag: item.topic_flag,
  }))
}

// 生活热搜适配器
export function adaptLifeBandResponse(
  payload: LifeBandPayload,
  type: HotSearchType = 'life',
): UnifiedHotSearchItem[] {
  const bandList = payload.data?.band_list ?? []
  return bandList.map((item) => ({
    type,
    word: item.word,
    num: item.num || 0,
    realpos: item.loc_page || 0,
    labelName: item.icon_desc || item.small_icon_desc || '',
    icon: item.icon || null,
    iconDesc: item.icon_desc || '',
    iconDescColor: item.icon_desc_color || '',
    topicFlag: item.topic_flag,
  }))
}

// 社会热搜适配器
export function adaptSocialBandResponse(
  payload: SocialBandPayload,
  type: HotSearchType = 'social',
): UnifiedHotSearchItem[] {
  const bandList = payload.data?.band_list ?? []
  return bandList.map((item) => ({
    type,
    word: item.word,
    num: item.num || 0,
    realpos: item.rank || 0,
    labelName: '',
    icon: null,
    iconDesc: '',
    iconDescColor: '',
    topicFlag: item.topic_flag,
  }))
}

function normalizeLabel(item: HotSearchItem): string {
  if (item.labelName) {
    return item.labelName
  }
  if (item.iconDesc) {
    return item.iconDesc
  }
  return ''
}

export function adaptHotSearchResponse(
  payload: HotSearchPayload,
  type: HotSearchType = 'hot',
): HotSearchPage {
  const realtime = payload.data?.realtime ?? []

  return {
    items: realtime
      .filter((item) => item.is_ad !== 1)
      .map((item) => ({
        type,
        word: item.word,
        num: item.num,
        realpos: item.realpos,
        labelName: normalizeLabel(item),
        icon: item.icon,
        iconDesc: item.iconDesc ?? '',
        iconDescColor: item.iconDescColor ?? '',
        topicFlag: item.topicFlag,
      })),
  }
}
