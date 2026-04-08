import type { FeedAuthor, FeedItem } from '@/features/weibo/models/feed'

export interface CommentItem {
  id: string
  text: string
  createdAtLabel: string
  author: FeedAuthor
  likeCount: number
  source?: string
  replyComment: Pick<CommentItem, 'id' | 'text' | 'author'> | null
  comments: CommentItem[]
}

export interface StatusCommentsPage {
  items: CommentItem[]
  nextCursor: string | null
}

export interface StatusDetail {
  status: FeedItem
}
