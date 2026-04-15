import type { FeedAuthor } from './feed'

export interface NotificationAuthor extends FeedAuthor {}

/** Comment notification with reply reference (similar to retweet relationship) */
export interface CommentNotification {
  id: string
  /** Comment text */
  text: string
  /** Commenter */
  user: NotificationAuthor
  /** The weibo being commented */
  status?: {
    id: string
    text: string
    author: NotificationAuthor
  }
  /** The comment being replied to (if this is a reply) */
  replyComment?: {
    id: string
    text: string
    user: NotificationAuthor
  }
  createdAtLabel: string
  source?: string
}

/** Mention notification */
export interface MentionNotification {
  id: string
  /** Raw text with @mentions */
  textRaw: string
  /** Mentioner */
  user: NotificationAuthor
  /** The status where user was mentioned */
  status: {
    id: string
    text: string
    textRaw: string
    author: NotificationAuthor
  }
  createdAtLabel: string
  source?: string
}

/** Like notification */
export interface LikeNotification {
  id: string
  /** User who liked */
  user: NotificationAuthor
  /** The liked weibo */
  status: {
    id: string
    text: string
    author: NotificationAuthor
  }
  createdAtLabel: string
  source?: string
}

export type NotificationItem = MentionNotification | CommentNotification | LikeNotification

export interface NotificationsPage {
  items: NotificationItem[]
  nextCursor: string | null
}
