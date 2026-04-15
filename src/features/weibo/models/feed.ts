export interface FeedAuthor {
  id: string
  name: string
  avatarUrl: string | null
}

export interface FeedStats {
  likes: number
  comments: number
  reposts: number
}

export interface FeedImage {
  id: string
  thumbnailUrl: string
  largeUrl: string
}

export interface FeedDashQuality {
  id: string
  label: string
}

/** DASH manifest from original mpdInfo */
export interface FeedMpdSource {
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
  type: 'video' | 'audio'
  streamUrl: string
  title: string
  coverUrl: string | null
  dash?: FeedDashSource
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
  liked?: boolean
  favorited?: boolean
  author: FeedAuthor
  text: string
  createdAtLabel: string
  stats: FeedStats
  images: FeedImage[]
  media: FeedMedia | null
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

export interface TimelinePage {
  items: FeedItem[]
  nextCursor: string | null
}

/** Minimal fields needed to navigate to a status detail URL from the shell. */
export type StatusDetailNavigationItem = Pick<FeedItem, 'author' | 'id' | 'mblogId'>
