import type {
  FeedAuthor,
  FeedEmoticon,
  FeedImage,
  FeedUrlEntity,
} from '@/features/weibo/models/feed'
import type { FeedItem } from '@/features/weibo/models/feed'

export interface CommentPreviewItem {
  id: string
  text: string
  author: FeedAuthor
  emoticons?: Record<string, FeedEmoticon>
  urlEntities?: FeedUrlEntity[]
  images: FeedImage[]
}

export interface CommentFilterOption {
  param: string
  title: string
  isDefault: number
}

export interface CommentItem {
  id: string
  text: string
  createdAtLabel: string
  author: FeedAuthor
  likeCount: number
  source?: string
  emoticons?: Record<string, FeedEmoticon>
  urlEntities?: FeedUrlEntity[]
  images: FeedImage[]
  replyComment: CommentPreviewItem | null
  comments: CommentItem[]
  retweetedStatus?: FeedItem | null
}

export interface StatusCommentsPage {
  items: CommentItem[]
  nextCursor: string | null
  filterGroup?: CommentFilterOption[]
}

export interface StatusDetail {
  status: FeedItem
}
