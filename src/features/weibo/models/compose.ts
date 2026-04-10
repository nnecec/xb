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
