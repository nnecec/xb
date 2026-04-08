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

export interface FeedMedia {
  type: 'video' | 'audio'
  streamUrl: string
  title: string
  coverUrl: string | null
}

export interface FeedUrlEntity {
  shortUrl: string
  title: string
}

export interface FeedItem {
  id: string
  mblogId: string | null
  isLongText: boolean
  author: FeedAuthor
  text: string
  createdAtLabel: string
  stats: FeedStats
  images: FeedImage[]
  media: FeedMedia | null
  urlEntities?: FeedUrlEntity[]
  regionName?: string
  source?: string
  retweetedStatus?: Omit<FeedItem, 'retweetedStatus'> | null
}

export interface TimelinePage {
  items: FeedItem[]
  nextCursor: string | null
}
