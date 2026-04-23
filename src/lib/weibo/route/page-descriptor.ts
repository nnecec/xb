export type NotificationTab = 'mentions' | 'comments' | 'likes'

export type WeiboPageDescriptor =
  | { kind: 'home'; tab: 'for-you' | 'following' }
  | { kind: 'status'; authorId: string; statusId: string }
  | {
      kind: 'profile'
      profileId: string
      profileSource: 'u' | 'n'
      tab: 'posts' | 'replies' | 'media'
    }
  | { kind: 'favorites'; uid: string }
  | { kind: 'notifications'; tab: NotificationTab }
  | { kind: 'unsupported'; reason: 'invalid-url' | 'unmatched-path' }
