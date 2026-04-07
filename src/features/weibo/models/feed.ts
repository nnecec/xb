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

export interface FeedItem {
  id: string
  author: FeedAuthor
  text: string
  createdAtLabel: string
  stats: FeedStats
}

export interface TimelinePage {
  items: FeedItem[]
  nextCursor: string | null
}
