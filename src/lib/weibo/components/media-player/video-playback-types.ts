import type { FeedDashSource } from '@/lib/weibo/models/feed'

export type VideoPlaybackMedia =
  | {
      kind: 'video'
      sessionId: string
      src: string
      poster?: string
      dash?: FeedDashSource
    }
  | {
      kind: 'replay'
      sessionId: string
      src: string
      poster?: string
    }
  | {
      kind: 'live'
      sessionId: string
      src: string
      poster?: string
    }
  | {
      kind: 'unavailable'
      sessionId: string
      poster?: string
    }

export type PlayableVideoMedia = Exclude<VideoPlaybackMedia, { kind: 'unavailable' }>
