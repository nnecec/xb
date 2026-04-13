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
  | { kind: 'unsupported'; reason: 'invalid-url' | 'unmatched-path' }
