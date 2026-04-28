import type {
  FeedItem,
  FeedImage,
  FeedUrlEntity,
  FeedTopicEntity,
  FeedEmoticon,
} from '../../models/feed'

export interface ShareCardData {
  author: {
    name: string
    avatarUrl: string | null
    id: string
  }
  text: string
  images: Array<{
    id: string
    thumbnailUrl: string
    largeUrl: string
  }>
  videoCoverUrl?: string | null
  stats: {
    likes: number
    comments: number
    reposts: number
  }
  createdAt: string
  createdAtLabel: string
  mblogId: string | null
  source?: string
  regionName?: string
  retweetedStatus?: ShareCardData | null
  // For StatusText rendering
  emoticons?: Record<string, FeedEmoticon>
  urlEntities?: FeedUrlEntity[]
  topicEntities?: FeedTopicEntity[]
  imageEntities?: Record<string, FeedImage[]>
}

export type CardStyle =
  | 'default'
  | 'minimal'
  | 'glass'
  | 'bold'
  | 'contrast'
  | 'vogue'
  | 'soft'
  | 'sticker'
  | 'comic'

export interface ShareCardProps {
  data: ShareCardData
  theme?: 'light' | 'dark'
  showStats?: boolean
  showLink?: boolean
  showFullImages?: boolean
}
