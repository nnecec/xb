import { describe, expect, it } from 'vitest'

import { buildMediaAssets } from '@/lib/weibo/components/media-region/media-region-model'
import { extractMediaUrls } from '@/lib/weibo/utils/download-media'
import { normalizeSafeExternalUrl } from '@/lib/weibo/utils/safe-url'

import { mergeLongTextIntoFeedItem, toFeedItem, toMedia } from './transform'

describe('normalizeSafeExternalUrl', () => {
  it('allows http and https URLs and normalizes protocol-relative URLs', () => {
    expect(normalizeSafeExternalUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(normalizeSafeExternalUrl('http://example.com/path')).toBe('http://example.com/path')
    expect(normalizeSafeExternalUrl('//example.com/path')).toBe('https://example.com/path')
  })

  it('rejects empty values and unsafe schemes', () => {
    expect(normalizeSafeExternalUrl('')).toBeNull()
    expect(normalizeSafeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(normalizeSafeExternalUrl('weixin://profile/example')).toBeNull()
  })
})

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
      expect(result?.sourceObjectType).toBe('audio')
      expect(result?.streamUrl).toBe('https://example.com/audio.mp3')
    })

    it('retains unknown media but marks its original type for display decisions', () => {
      const result = toMedia({
        id: '123',
        page_info: {
          object_type: 'article',
          media_info: { stream_url: 'https://example.com/external.mp3' },
        },
      } as any)

      expect(result).toMatchObject({ type: 'audio', sourceObjectType: 'article' })
    })
  })
})

describe('toFeedItem URL entities', () => {
  it('skips url_struct entries with unsafe target schemes', () => {
    const result = toFeedItem({
      idstr: 'url-1',
      text_raw: 'unsafe http://t.cn/abc',
      user: { idstr: '1', screen_name: 'Alice' },
      url_struct: [
        {
          short_url: 'http://t.cn/abc',
          long_url: 'javascript:alert(1)',
          url_title: 'unsafe',
          url_type: 1,
        },
      ],
    } as any)

    expect(result.urlEntities).toBeUndefined()
  })

  it('normalizes protocol-relative url_struct targets', () => {
    const result = toFeedItem({
      idstr: 'url-2',
      text_raw: 'safe http://t.cn/abc',
      user: { idstr: '1', screen_name: 'Alice' },
      url_struct: [
        {
          short_url: 'http://t.cn/abc',
          long_url: '//example.com/path',
          url_title: 'safe',
          url_type: 1,
        },
      ],
    } as any)

    expect(result.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/abc',
        title: 'safe',
        url: 'https://example.com/path',
      },
    ])
  })
})

describe('toFeedItem media images', () => {
  it('maps livephoto images with dimensions and video url', () => {
    const result = toFeedItem({
      idstr: '5301829593990431',
      text_raw: '#哦#',
      user: { idstr: '7478408373', screen_name: '苏子竹qqq' },
      pic_ids: ['live-pic'],
      pic_infos: {
        'live-pic': {
          large: { url: 'https://wx3.sinaimg.cn/orj960/live-pic.jpg', width: 960, height: 1279 },
          largest: { url: 'https://wx3.sinaimg.cn/large/live-pic.jpg', width: 2048, height: 2730 },
          type: 'livephoto',
          video: 'https://livephoto.us.sinaimg.cn/live-pic.mov',
        },
      },
    } as any)

    expect(result.images).toEqual([
      {
        id: 'live-pic',
        thumbnailUrl: 'https://wx3.sinaimg.cn/orj960/live-pic.jpg',
        largeUrl: 'https://wx3.sinaimg.cn/large/live-pic.jpg',
        downloadUrls: [
          'https://wx3.sinaimg.cn/large/live-pic.jpg',
          'https://wx3.sinaimg.cn/orj960/live-pic.jpg',
        ],
        width: 2048,
        height: 2730,
        type: 'livephoto',
        livePhotoVideoUrl: 'https://livephoto.us.sinaimg.cn/live-pic.mov',
      },
    ])
  })

  it('maps mixed media video metadata for the media viewer', () => {
    const result = toFeedItem({
      idstr: 'mixed-1',
      text_raw: 'mixed media',
      user: { idstr: '1', screen_name: 'Alice' },
      mix_media_info: {
        items: [
          {
            type: 'video',
            id: 'video-1',
            data: {
              object_type: 'video',
              content1: '混合视频',
              page_pic: 'https://example.com/cover.jpg',
              media_info: {
                stream_url: 'https://example.com/video.mp4',
                mp4_hd_url: 'https://example.com/download.mp4',
                video_orientation: 'horizontal',
              },
            },
          },
        ],
      },
    } as any)

    expect(result.mixMediaInfo).toEqual([
      {
        type: 'video',
        id: 'video-1',
        videoCoverUrl: 'https://example.com/cover.jpg',
        videoStreamUrl: 'https://example.com/video.mp4',
        videoOrientation: 'horizontal',
        videoDownloadUrl: 'https://example.com/download.mp4',
        videoTitle: '混合视频',
      },
    ])
  })

  it('ignores unsupported mixed-media types instead of treating them as pictures', () => {
    const result = toFeedItem({
      idstr: 'mixed-live-1',
      text_raw: 'mixed live media',
      user: { idstr: '1', screen_name: 'Alice' },
      mix_media_info: {
        items: [
          {
            type: 'live',
            id: 'live-1',
            data: {
              page_pic: 'https://example.com/live.jpg',
            },
          },
        ],
      },
    } as any)

    expect(result.mixMediaInfo).toBeUndefined()
  })

  it('keeps a mixed-media Live Photo video in the batch download queue', () => {
    const result = toFeedItem({
      idstr: 'mixed-live-photo',
      text_raw: 'mixed live photo',
      user: { idstr: '1', screen_name: 'Alice' },
      mix_media_info: {
        items: [
          {
            type: 'pic',
            id: 'live-pic',
            data: {
              pic_id: 'live-pic',
              pic_infos: {
                'live-pic': {
                  large: { url: 'https://wx3.sinaimg.cn/large/live-pic.jpg' },
                  type: 'livephoto',
                  video_hd: 'https://livephoto.us.sinaimg.cn/live-pic.mp4',
                },
              },
            },
          },
        ],
      },
    } as any)

    expect(
      extractMediaUrls(buildMediaAssets(result), {
        author: result.author.name,
        text: result.text,
      }).map(({ url }) => url),
    ).toEqual([
      'https://wx3.sinaimg.cn/large/live-pic.jpg',
      'https://livephoto.us.sinaimg.cn/live-pic.mp4',
    ])
  })
})

describe('toFeedItem markdown', () => {
  it('preserves markdown raw text for truncated long-text markdown statuses', () => {
    const result = toFeedItem({
      idstr: 'md-1',
      mblogid: 'R1yHQwdrn',
      isMarkdown: true,
      isLongText: true,
      text: '# Heading<br />truncated<span class="expand">展开</span>',
      text_raw: '# Heading\n\ntruncated',
      user: { idstr: '1', screen_name: 'Alice' },
    })

    expect(result.isMarkdown).toBe(true)
    expect(result.isLongText).toBe(true)
    expect(result.text).toBe('# Heading\n\ntruncated')
    expect(result.markdownText).toBe('# Heading\n\ntruncated')
  })

  it('normalizes html preview text when markdown raw text is missing', () => {
    const result = toFeedItem({
      idstr: 'md-2',
      isMarkdown: true,
      text: '# Heading<br />preview<span class="expand">展开</span>',
      user: { idstr: '1', screen_name: 'Alice' },
    })

    expect(result.markdownText).toBe('# Heading\npreview')
  })

  it('keeps markdown rendering data after long text is merged', () => {
    const item = toFeedItem({
      idstr: 'md-3',
      isMarkdown: true,
      isLongText: true,
      text_raw: '# Preview',
      user: { idstr: '1', screen_name: 'Alice' },
    })

    const result = mergeLongTextIntoFeedItem(item, {
      longTextContent: '# Full<br />**body**',
      longTextContent_raw: '# Full\n\n**body**',
    })

    expect(result.isLongText).toBe(false)
    expect(result.isMarkdown).toBe(true)
    expect(result.text).toBe('# Full\n\n**body**')
    expect(result.markdownText).toBe('# Full\n\n**body**')
  })
})
