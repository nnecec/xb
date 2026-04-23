import { describe, expect, it } from 'vitest'

import { toMedia } from './transform'

describe('toMedia', () => {
  describe('live type', () => {
    it('returns live media when object_type is live with live_ld', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/cover.jpg',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 1,
            live_start_time: 1776768301,
            video_title: 'REDMI K90 Max 新品发布会',
            subscribe: {
              cover: 'https://example.com/subscribe-cover.jpg',
            },
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result).toEqual({
        type: 'live',
        streamUrl: 'https://example.com/live.m3u8',
        title: 'REDMI K90 Max 新品发布会',
        coverUrl: 'https://example.com/cover.jpg',
        liveStatus: 1,
        liveStartTime: 1776768301,
        replayUrl: undefined,
      })
    })

    it('returns replayUrl when live_status is 3', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/cover.jpg',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 3,
            replay_hd: 'https://example.com/replay.m3u8',
            video_title: 'REDMI K90 Max 新品发布会',
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result).toEqual({
        type: 'live',
        streamUrl: 'https://example.com/live.m3u8',
        title: 'REDMI K90 Max 新品发布会',
        coverUrl: 'https://example.com/cover.jpg',
        liveStatus: 3,
        liveStartTime: undefined,
        replayUrl: 'https://example.com/replay.m3u8',
      })
    })

    it('prefers live_ld over stream_url', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/cover.jpg',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            stream_url: 'https://example.com/stream.mp4',
            live_status: 1,
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.streamUrl).toBe('https://example.com/live.m3u8')
    })

    it('falls back to stream_url when live_ld is missing', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/cover.jpg',
          media_info: {
            stream_url: 'https://example.com/stream.mp4',
            live_status: 1,
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.streamUrl).toBe('https://example.com/stream.mp4')
    })

    it('prefers page_pic over subscribe.cover for coverUrl', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/page-cover.jpg',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 1,
            subscribe: {
              cover: 'https://example.com/subscribe-cover.jpg',
            },
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.coverUrl).toBe('https://example.com/page-cover.jpg')
    })

    it('uses subscribe.cover when page_pic is missing', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 1,
            subscribe: {
              cover: 'https://example.com/subscribe-cover.jpg',
            },
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.coverUrl).toBe('https://example.com/subscribe-cover.jpg')
    })

    it('returns null coverUrl when both page_pic and subscribe.cover are missing', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 1,
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.coverUrl).toBeNull()
    })

    it('handles live_status === 0 (not live)', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          page_pic: 'https://example.com/cover.jpg',
          media_info: {
            live_ld: 'https://example.com/live.m3u8',
            live_status: 0,
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.type).toBe('live')
      expect(result?.liveStatus).toBe(0)
    })

    it('returns empty string for streamUrl when both live_ld and stream_url are missing', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'live',
          media_info: {
            live_status: 1,
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.streamUrl).toBe('')
    })
  })

  describe('video type', () => {
    it('still handles video type correctly', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'video',
          media_info: {
            stream_url: 'https://example.com/video.mp4',
            video_title: 'Test Video',
            big_pic_info: {
              pic_big: { url: 'https://example.com/poster.jpg' },
            },
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.type).toBe('video')
      expect(result?.streamUrl).toBe('https://example.com/video.mp4')
      expect(result?.coverUrl).toBe('https://example.com/poster.jpg')
    })
  })

  describe('audio type', () => {
    it('still handles audio type correctly', () => {
      const status = {
        id: '123',
        page_info: {
          object_type: 'audio',
          media_info: {
            stream_url: 'https://example.com/audio.mp3',
            video_title: 'Test Audio',
          },
        },
      } as const

      const result = toMedia(status as any)

      expect(result?.type).toBe('audio')
      expect(result?.streamUrl).toBe('https://example.com/audio.mp3')
    })
  })
})
