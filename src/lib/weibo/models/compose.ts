import type { FeedItem } from '@/lib/weibo/models/feed'
import type { CommentItem } from '@/lib/weibo/models/status'

export type ComposeMode = 'comment' | 'repost'

export type ComposeTarget =
  | {
      kind: 'status'
      mode: ComposeMode
      statusId: string
      targetCommentId: null
      authorName: string
      excerpt: string
    }
  | {
      kind: 'comment'
      mode: ComposeMode
      statusId: string
      targetCommentId: string
      authorName: string
      excerpt: string
    }

export interface SubmitComposeInput {
  target: ComposeTarget
  text: string
  alsoSecondaryAction: boolean
}

export function composeTargetFromFeedItem(item: FeedItem, mode: ComposeMode): ComposeTarget {
  return {
    kind: 'status',
    mode,
    statusId: item.id,
    targetCommentId: null,
    authorName: item.author.name,
    excerpt: item.text.trim().slice(0, 80),
  }
}

export function composeTargetFromComment(
  rootStatusId: string,
  comment: CommentItem,
): ComposeTarget {
  return {
    kind: 'comment',
    mode: 'comment',
    statusId: rootStatusId,
    targetCommentId: comment.id,
    authorName: comment.author.name,
    excerpt: comment.text.trim().slice(0, 80),
  }
}
