import type { FeedAuthor, FeedImage, FeedUrlEntity } from '@/features/weibo/models/feed'
import type { FeedItem } from '@/features/weibo/models/feed'

export interface CommentPreviewItem {
  id: string
  text: string
  author: FeedAuthor
  urlEntities?: FeedUrlEntity[]
  images: FeedImage[]
}

export interface CommentItem {
  id: string
  text: string
  createdAtLabel: string
  author: FeedAuthor
  likeCount: number
  source?: string
  urlEntities?: FeedUrlEntity[]
  images: FeedImage[]
  replyComment: CommentPreviewItem | null
  comments: CommentItem[]
}

export interface StatusCommentsPage {
  items: CommentItem[]
  nextCursor: string | null
}

export interface StatusDetail {
  status: FeedItem
}
