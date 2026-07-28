import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertAllowedMediaUrl,
  assertAllowedMweiboFetchUrl,
  createMediaRequestHeaderRule,
  handleMediaFetch,
  handleMediaHead,
  maxBackgroundMediaBytes,
} from '@/entrypoints/background'
import { buildTopicSearchUrl } from '@/lib/weibo/services/m-weibo-client'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('background media request header rule', () => {
  it('only matches background fetch requests for media downloads', () => {
    const rule = createMediaRequestHeaderRule()

    expect(rule.condition.resourceTypes).toEqual(['xmlhttprequest'])
    expect(rule.condition.tabIds).toEqual([-1])
    expect(rule.condition.resourceTypes).not.toContain('media')
    expect(rule.condition.resourceTypes).not.toContain('image')
  })
})

describe('background media URL allowlist', () => {
  it('allows Weibo image CDN URLs', () => {
    expect(() => {
      assertAllowedMediaUrl('https://wx1.sinaimg.cn/large/a.jpg')
    }).not.toThrow()
  })

  it('allows known Weibo video CDN URLs', () => {
    expect(() => {
      assertAllowedMediaUrl('https://video.weibocdn.com/video/a.mp4')
    }).not.toThrow()
  })

  it('rejects non-HTTPS media URLs', () => {
    expect(() => {
      assertAllowedMediaUrl('http://wx1.sinaimg.cn/large/a.jpg')
    }).toThrow('unsupported-media-url')
  })

  it('rejects unrelated hosts', () => {
    expect(() => {
      assertAllowedMediaUrl('https://example.com/a.jpg')
    }).toThrow('unsupported-media-host')
  })

  it('rejects weibo.com page and API URLs', () => {
    expect(() => {
      assertAllowedMediaUrl('https://weibo.com/ajax/statuses/show?id=1')
    }).toThrow('unsupported-media-host')
  })
})

describe('background media proxy responses', () => {
  it('rejects non-media HEAD responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          headers: {
            'content-length': '12',
            'content-type': 'text/html',
          },
        }),
      ),
    )

    await expect(
      handleMediaHead(
        {
          type: 'media-head',
          url: 'https://wx1.sinaimg.cn/large/a.jpg',
        },
        'https://weibo.com/',
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'unsupported-media-content-type',
    })
  })

  it('rejects non-media fetch responses before returning data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not-media', {
          headers: {
            'content-length': '9',
            'content-type': 'text/html',
          },
        }),
      ),
    )

    await expect(
      handleMediaFetch(
        {
          type: 'media-fetch',
          url: 'https://wx1.sinaimg.cn/large/a.jpg',
        },
        'https://weibo.com/',
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'unsupported-media-content-type',
    })
  })

  it('rejects oversized media fetch responses before buffering', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('small-body', {
          headers: {
            'content-length': String(maxBackgroundMediaBytes + 1),
            'content-type': 'image/jpeg',
          },
        }),
      ),
    )

    await expect(
      handleMediaFetch(
        {
          type: 'media-fetch',
          url: 'https://wx1.sinaimg.cn/large/a.jpg',
        },
        'https://weibo.com/',
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'media-fetch-too-large',
    })
  })

  it('returns base64 data for media fetch responses below the size limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('image-bytes', {
          headers: {
            'content-length': '11',
            'content-type': 'image/jpeg; charset=binary',
          },
        }),
      ),
    )

    await expect(
      handleMediaFetch(
        {
          type: 'media-fetch',
          url: 'https://wx1.sinaimg.cn/large/a.jpg',
        },
        'https://weibo.com/',
      ),
    ).resolves.toEqual({
      ok: true,
      contentType: 'image/jpeg',
      data: Buffer.from('image-bytes').toString('base64'),
    })
  })

  it('accepts Live Photo videos served as generic binary data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('live-photo-bytes', {
          headers: {
            'content-length': '16',
            'content-type': 'application/octet-stream',
          },
        }),
      ),
    )

    await expect(
      handleMediaFetch(
        {
          type: 'media-fetch',
          url: 'https://livephoto.us.sinaimg.cn/live-pic.mov',
        },
        'https://weibo.com/',
      ),
    ).resolves.toEqual({
      ok: true,
      contentType: 'application/octet-stream',
      data: Buffer.from('live-photo-bytes').toString('base64'),
    })
  })
})

describe('m.weibo fetch allowlist', () => {
  it('allows the unread reminders endpoint', () => {
    expect(() => {
      assertAllowedMweiboFetchUrl('https://m.weibo.cn/api/remind/unread')
    }).not.toThrow()
  })

  it('allows topic search URLs built by the m.weibo client', () => {
    expect(() => {
      assertAllowedMweiboFetchUrl(buildTopicSearchUrl('测试', 1))
    }).not.toThrow()
  })

  it('rejects non-HTTPS URLs', () => {
    expect(() => {
      assertAllowedMweiboFetchUrl('http://m.weibo.cn/api/remind/unread')
    }).toThrow('unsupported-mweibo-url')
  })

  it('rejects other hosts', () => {
    expect(() => {
      assertAllowedMweiboFetchUrl('https://weibo.com/api/remind/unread')
    }).toThrow('unsupported-mweibo-url')
  })

  it('rejects unrelated m.weibo.cn paths', () => {
    expect(() => {
      assertAllowedMweiboFetchUrl('https://m.weibo.cn/api/config')
    }).toThrow('unsupported-mweibo-endpoint')
  })
})
