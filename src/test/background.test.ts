import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertAllowedMediaUrl,
  assertAllowedMweiboFetchUrl,
  createMediaRequestHeaderRule,
  handleMediaFetch,
  handleMediaHead,
  handleMweiboFetch,
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

describe('m.weibo fetch responses', () => {
  function installBrowserCookies() {
    Object.defineProperty(globalThis, 'browser', {
      configurable: true,
      value: {
        cookies: {
          get: vi.fn(async () => ({ value: 'xsrf-token' })),
        },
      },
    })
  }

  it('returns JSON with safe response metadata', async () => {
    installBrowserCookies()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: 1, data: { cards: [] } }), {
          headers: { 'content-type': 'application/json; charset=utf-8' },
          status: 200,
        }),
      ),
    )

    await expect(
      handleMweiboFetch({
        type: 'mweibo-fetch',
        url: buildTopicSearchUrl('测试', 1),
      }),
    ).resolves.toEqual({
      ok: true,
      data: { ok: 1, data: { cards: [] } },
      status: 200,
      contentType: 'application/json',
    })
  })

  it('classifies HTML challenge pages without returning their body', async () => {
    installBrowserCookies()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>challenge</html>', {
          headers: { 'content-type': 'text/html; charset=utf-8' },
          status: 200,
        }),
      ),
    )

    await expect(
      handleMweiboFetch({
        type: 'mweibo-fetch',
        url: buildTopicSearchUrl('测试', 1),
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'mweibo-fetch-unexpected-content',
      status: 200,
      contentType: 'text/html',
    })
  })

  it('accepts JSON payloads served as text/plain', async () => {
    installBrowserCookies()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: 1, data: {} }), {
          headers: { 'content-type': 'text/plain' },
          status: 200,
        }),
      ),
    )

    await expect(
      handleMweiboFetch({
        type: 'mweibo-fetch',
        url: buildTopicSearchUrl('测试', 1),
      }),
    ).resolves.toEqual({
      ok: true,
      data: { ok: 1, data: {} },
      status: 200,
      contentType: 'text/plain',
    })
  })

  it('preserves HTTP status and content type for failed responses', async () => {
    installBrowserCookies()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: 0 }), {
          headers: { 'content-type': 'application/json' },
          status: 403,
        }),
      ),
    )

    await expect(
      handleMweiboFetch({
        type: 'mweibo-fetch',
        url: buildTopicSearchUrl('测试', 1),
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'mweibo-fetch-failed:403',
      status: 403,
      contentType: 'application/json',
    })
  })
})
