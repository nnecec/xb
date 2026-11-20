/**
 * Shared types for Weibo API response transformation.
 * These types represent the raw Weibo API payloads.
 */

export interface WeiboStatusUser {
  avatar_hd?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

export interface WeiboMediaInfo {
  video_title?: string
  video_orientation?: 'vertical' | 'horizontal'
  mp4_720p_mp4?: string
  h265_mp4_hd?: string
  mp4_hd_url?: string
  stream_url?: string
  stream_url_hd?: string
  live_ld?: string
  live_status?: number
  live_start_time?: string
  replay_hd?: string
  author_mid?: string
  big_pic_info?: {
    pic_big?: {
      url?: string
    }
  }
  subscribe?: {
    cover?: string
  }
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
    }
  }>
  object?: {
    object_id?: string
  }
  video_details?: {
    video_id_str?: string
  }
  stream?: {
    url?: string
  }
  media_info?: {
    video_playback?: Array<{
      play_info?: {
        url?: string
        width?: number
        height?: number
      }
      meta?: {
        video_duration?: number
      }
    }>
  }
}

export interface WeiboPageInfo {
  type?: string
  object_type?: number | string
  object_id?: string
  content1?: string
  content2?: string
  page_pic?: string | { url?: string }
  page_url?: string
  page_title?: string
  author_mid?: string
  media_info?: WeiboMediaInfo
}

export interface WeiboPicInfo {
  large?: { url?: string; width?: number; height?: number }
  largest?: { url?: string; width?: number; height?: number }
  original?: { url?: string; width?: number; height?: number }
  woriginal?: { url?: string; width?: number; height?: number }
  bmiddle?: { url?: string; width?: number; height?: number }
  thumbnail?: { url?: string; width?: number; height?: number }
  mw2000?: { url?: string; width?: number; height?: number }
  video?: string | { url?: string }
  video_hd?: string | { url?: string }
  livephoto_video?: string | { url?: string }
  pic_status?: number
  type?: string
}

export interface WeiboStatus {
  id?: number | string
  idstr?: string
  mid?: string
  mblogid?: string
  user?: WeiboStatusUser
  created_at?: string
  deleted?: string
  text?: string
  text_raw?: string
  isMarkdown?: boolean
  longText?: {
    longTextContent?: string
  }
  isLongText?: boolean
  source?: string
  region_name?: string
  pic_ids?: string[]
  pic_num?: number
  pic_infos?: Record<string, WeiboPicInfo>
  mix_media_info?: {
    items?: Array<{
      type?: 'video' | 'pic' | 'live'
      id?: string
      data?: {
        object_type?: 'video'
        content1?: string
        content2?: string
        pic_id?: string
        pic_infos?: Record<string, WeiboPicInfo>
        media_info?: WeiboMediaInfo
        page_pic?: string
        page_url?: string
        stream?: { url?: string }
        thumbnail?: { url?: string; width?: number; height?: number }
        bmiddle?: { url?: string; width?: number; height?: number }
        large?: { url?: string; width?: number; height?: number }
        original?: { url?: string; width?: number; height?: number }
        largest?: { url?: string; width?: number; height?: number }
        mw2000?: { url?: string; width?: number; height?: number }
      }
    }>
  }
  page_info?: WeiboPageInfo
  url_struct?: Array<{
    short_url?: string
    long_url?: string
    ori_url?: string
    h5_target_url?: string
    url_title?: string
    url_type?: number | string
    pic_ids?: string[]
    pic_infos?: Record<string, WeiboPicInfo>
  }>
  topic_struct?: Array<{
    topic_title?: string
    topic_url?: string
  }>
  retweeted_status?: WeiboStatus
  analysis_extra?: string
  reposts_count?: number
  comments_count?: number
  attitudes_count?: number
  favorited?: boolean
  attitudes_status?: number | boolean
  title?: {
    text?: string
  }
  reply_comment?: WeiboStatus
  comments?: WeiboStatus[]
  more_info?: {
    text?: string
  }
  like_counts?: number
  liked?: boolean
  isAd?: number
}

export interface WeiboLongTextData {
  ok?: number
  longTextContent?: string
  longTextContent_raw?: string
  isMarkdown?: boolean
  pic_ids?: string[]
  pic_infos?: Record<string, WeiboPicInfo>
  topic_struct?: Array<{
    topic_title?: string
  }>
  url_struct?: Array<{
    short_url?: string
    long_url?: string
    ori_url?: string
    h5_target_url?: string
    url_title?: string
    url_type?: number
    pic_ids?: string[]
    pic_infos?: Record<string, WeiboPicInfo>
  }>
}
