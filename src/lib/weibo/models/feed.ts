export interface FeedAuthor {
  id: string
  /** Alias for `id`, kept for compatibility with consumers that read `author.uid`. */
  uid?: string
  name: string
  avatarUrl: string | null
}

interface FeedStats {
  likes: number
  comments: number
  reposts: number
}

export interface FeedImage {
  id: string
  thumbnailUrl: string
  largeUrl: string
  downloadUrls?: string[]
  width?: number
  height?: number
  type?: 'image' | 'livephoto'
  livePhotoVideoUrl?: string
}

/** A single item inside mix_media_info */
export interface FeedMixMediaItem {
  type: 'video' | 'pic'
  id: string
  videoCoverUrl?: string
  videoStreamUrl?: string
  videoDash?: FeedDashSource
  videoOrientation?: 'vertical' | 'horizontal'
  /** Direct mp4 URL for downloading (avoids DASH/DRM issues) */
  videoDownloadUrl?: string
  videoTitle?: string
  /** Only present when type === 'pic' */
  image?: FeedImage
}

export interface FeedDashQuality {
  id: string
  label: string
}

/** DASH manifest from original mpdInfo */
interface FeedMpdSource {
  type: 'mpd'
  manifestXml: string
  qualities: FeedDashQuality[]
}

/** Progressive URL list from playback_list without MPD */
export interface FeedPlaybackSource {
  type: 'playback'
  sources: Array<{ id: string; label: string; url: string }>
  selectedIndex: number
}

/** DASH manifest + representation ids (aligned with `playback_list` / MPD `Representation@id`). */
export type FeedDashSource = FeedMpdSource | FeedPlaybackSource

export interface FeedMedia {
  type: 'video' | 'audio' | 'podcast_audio' | 'live'
  /** 原始 page_info.object_type，供展示层排除未知外部媒体的自动折叠。 */
  sourceObjectType?: string
  streamUrl: string
  title: string
  coverUrl: string | null
  dash?: FeedDashSource
  liveStatus?: number
  liveStartTime?: string | number
  replayUrl?: string
  videoOrientation?: 'vertical' | 'horizontal'
  /** Direct mp4 URL for downloading (avoids DASH/DRM issues) */
  downloadUrl?: string
}

export interface FeedEmoticon {
  phrase: string
  url: string
}

export interface FeedUrlEntity {
  shortUrl: string
  title: string
  url: string
}

export interface FeedTopicEntity {
  title: string
  url: string
}

export interface FeedItem {
  id: string
  mblogId: string | null
  isLongText: boolean
  deleted?: boolean
  liked?: boolean
  favorited?: boolean
  author: FeedAuthor
  text: string
  isMarkdown?: boolean
  markdownText?: string
  createdAt: string
  createdAtLabel: string
  stats: FeedStats
  images: FeedImage[]
  imageEntities?: Record<string, FeedImage[]>
  media: FeedMedia | null
  /** 视频+图片混合类型的媒体列表 */
  mixMediaInfo?: FeedMixMediaItem[]
  emoticons?: Record<string, FeedEmoticon>
  urlEntities?: FeedUrlEntity[]
  topicEntities?: FeedTopicEntity[]
  regionName?: string
  source?: string
  title?: {
    text: string
  }
  retweetedStatus?: Omit<FeedItem, 'retweetedStatus'> | null
}

export interface TopicChannel {
  id: string
  name: string
}

export interface TopicHeadData {
  bgImgUrl: string | null
  title: string
  midtext: string
  downtext: string
  themeBackgroundColor: string | null
}

export interface TimelinePage {
  items: FeedItem[]
  nextCursor: string | null
  channels?: TopicChannel[]
  headData?: TopicHeadData | null
}

/** Minimal fields needed to navigate to a status detail URL from the shell. */
export type StatusDetailNavigationItem = Pick<FeedItem, 'author' | 'id' | 'mblogId'>
