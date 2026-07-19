import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

import {
  downloadAsZip,
  estimateTotalSize,
  extractMediaUrls,
  inferExtension,
} from './download-media'

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(globalThis, 'browser', {
    writable: true,
    configurable: true,
    value: {
      runtime: {
        getManifest: () => ({ version: '0.0.0-test' }),
      },
    },
  })
})

describe('inferExtension', () => {
  it('应该从 URL 中推断出正确的扩展名', () => {
    expect(inferExtension('https://example.com/image.jpg')).toBe('jpg')
    expect(inferExtension('https://example.com/image.jpeg')).toBe('jpeg')
    expect(inferExtension('https://example.com/image.png')).toBe('png')
    expect(inferExtension('https://example.com/image.gif')).toBe('gif')
    expect(inferExtension('https://example.com/image.webp')).toBe('webp')
    expect(inferExtension('https://example.com/video.mp4')).toBe('mp4')
    expect(inferExtension('https://example.com/video.mov')).toBe('mov')
  })

  it('应该处理带查询参数的 URL', () => {
    expect(inferExtension('https://example.com/image.jpg?size=large')).toBe('jpg')
    expect(inferExtension('https://example.com/video.mp4?token=abc123')).toBe('mp4')
  })

  it('应该为无扩展名的 URL 返回默认值', () => {
    expect(inferExtension('https://example.com/image')).toBe('jpg')
    expect(inferExtension('https://example.com/video/stream')).toBe('mp4')
  })
})

describe('extractMediaUrls', () => {
  const createMockItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
    id: '1',
    mblogId: 'abc123',
    isLongText: false,
    author: {
      id: 'user1',
      name: '测试用户',
      avatarUrl: null,
    },
    text: '这是一条测试微博',
    createdAt: '2024-01-01',
    createdAtLabel: '1小时前',
    stats: {
      likes: 0,
      comments: 0,
      reposts: 0,
    },
    images: [],
    media: null,
    ...overrides,
  })

  it('应该提取纯图片微博的所有图片', () => {
    const item = createMockItem({
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
        },
        {
          id: '2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          largeUrl: 'https://example.com/large2.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(2)
    expect(urls[0].url).toBe('https://example.com/large1.jpg')
    expect(urls[0].type).toBe('image')
    expect(urls[0].filename).toContain('测试用户')
    expect(urls[0].filename).toContain('_1.jpg')
    expect(urls[1].url).toBe('https://example.com/large2.jpg')
    expect(urls[1].filename).toContain('_2.jpg')
  })

  it('应该保留图片下载候选 URL', () => {
    const item = createMockItem({
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
          downloadUrls: ['https://example.com/large1.jpg', 'https://example.com/original1.jpg'],
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls[0].fallbackUrls).toEqual([
      'https://example.com/large1.jpg',
      'https://example.com/original1.jpg',
    ])
  })

  it('应该为 sinaimg 图片补充常见尺寸候选并规范化协议', () => {
    const item = createMockItem({
      images: [
        {
          id: '1',
          thumbnailUrl: 'http://wx1.sinaimg.cn/thumbnail/pic.jpg',
          largeUrl: 'http://wx1.sinaimg.cn/large/pic.jpg',
          downloadUrls: ['https://wx1.sinaimg.cn/woriginal/pic.jpg'],
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls[0].url).toBe('https://wx1.sinaimg.cn/large/pic.jpg')
    expect(urls[0].fallbackUrls).toEqual([
      'https://wx1.sinaimg.cn/large/pic.jpg',
      'https://wx1.sinaimg.cn/woriginal/pic.jpg',
      'https://wx1.sinaimg.cn/mw2000/pic.jpg',
      'https://wx1.sinaimg.cn/original/pic.jpg',
      'https://wx1.sinaimg.cn/orj1080/pic.jpg',
      'https://wx1.sinaimg.cn/orj960/pic.jpg',
      'https://wx1.sinaimg.cn/bmiddle/pic.jpg',
      'https://wx1.sinaimg.cn/thumbnail/pic.jpg',
    ])
  })

  it('应该提取 Live Photo 的图片和视频', () => {
    const item = createMockItem({
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
          type: 'livephoto',
          livePhotoVideoUrl: 'https://example.com/video1.mp4',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(2)
    expect(urls[0].url).toBe('https://example.com/large1.jpg')
    expect(urls[0].type).toBe('image')
    expect(urls[1].url).toBe('https://example.com/video1.mp4')
    expect(urls[1].type).toBe('video')
  })

  it('应该提取单视频微博', () => {
    const item = createMockItem({
      media: {
        type: 'video',
        streamUrl: 'https://example.com/stream.mp4',
        title: '测试视频',
        coverUrl: null,
        downloadUrl: 'https://example.com/download.mp4',
      },
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(1)
    expect(urls[0].url).toBe('https://example.com/download.mp4')
    expect(urls[0].type).toBe('video')
  })

  it('应该在没有 downloadUrl 时降级到 streamUrl', () => {
    const item = createMockItem({
      media: {
        type: 'video',
        streamUrl: 'https://example.com/stream.mp4',
        title: '测试视频',
        coverUrl: null,
      },
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(1)
    expect(urls[0].url).toBe('https://example.com/stream.mp4')
  })

  it('应该提取混合媒体中的图片和视频', () => {
    const item = createMockItem({
      mixMediaInfo: [
        {
          type: 'pic',
          id: '1',
          image: {
            id: '1',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
            largeUrl: 'https://example.com/large1.jpg',
          },
        },
        {
          type: 'video',
          id: '2',
          videoCoverUrl: 'https://example.com/cover.jpg',
          videoStreamUrl: 'https://example.com/stream.mp4',
          videoDownloadUrl: 'https://example.com/download.mp4',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(2)
    expect(urls[0].url).toBe('https://example.com/large1.jpg')
    expect(urls[0].type).toBe('image')
    expect(urls[1].url).toBe('https://example.com/download.mp4')
    expect(urls[1].type).toBe('video')
  })

  it('应该处理混合媒体中的 Live Photo', () => {
    const item = createMockItem({
      mixMediaInfo: [
        {
          type: 'pic',
          id: '1',
          image: {
            id: '1',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
            largeUrl: 'https://example.com/large1.jpg',
            type: 'livephoto',
            livePhotoVideoUrl: 'https://example.com/video1.mp4',
          },
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(2)
    expect(urls[0].type).toBe('image')
    expect(urls[1].type).toBe('video')
  })

  it('应该跳过没有 URL 的混合媒体视频', () => {
    const item = createMockItem({
      mixMediaInfo: [
        {
          type: 'video',
          id: '1',
          videoCoverUrl: 'https://example.com/cover.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(0)
  })

  it('应该为空微博返回空数组', () => {
    const item = createMockItem()

    const urls = extractMediaUrls(item)

    expect(urls).toHaveLength(0)
  })

  it('应该正确生成文件名（包含作者和微博文本）', () => {
    const item = createMockItem({
      author: {
        id: 'user1',
        name: '张三',
        avatarUrl: null,
      },
      text: '今天天气真好啊，出去玩了一整天',
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls[0].filename).toContain('张三')
    expect(urls[0].filename).toContain('今天天气真好啊')
    expect(urls[0].filename).toMatch(/张三_今天天气真好啊.*_1\.jpg/)
  })

  it('应该处理包含 HTML 标签的文本', () => {
    const item = createMockItem({
      text: '<a href="#">链接</a>这是内容',
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls[0].filename).not.toContain('<')
    expect(urls[0].filename).not.toContain('>')
    expect(urls[0].filename).toContain('链接这是内容')
  })

  it('应该处理包含特殊字符的文本', () => {
    const item = createMockItem({
      text: '测试/特殊:字符*文件名',
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    expect(urls[0].filename).not.toContain('/')
    expect(urls[0].filename).not.toContain(':')
    expect(urls[0].filename).not.toContain('*')
  })

  it('应该截断超过 10 个字符的文本', () => {
    const item = createMockItem({
      text: '这是一条非常非常非常长的微博文本内容',
      images: [
        {
          id: '1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
        },
      ],
    })

    const urls = extractMediaUrls(item)

    const textPart = urls[0].filename.split('_')[1]
    expect(textPart.length).toBeLessThanOrEqual(10)
  })
})

describe('download media proxy', () => {
  it('应该通过 background 代理预估媒体大小', async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, size: 1024 })
      .mockResolvedValueOnce({ ok: true, size: 2048 })

    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        runtime: {
          sendMessage,
        },
      },
    })

    await expect(
      estimateTotalSize([
        { url: 'https://wx1.sinaimg.cn/large/a.jpg', filename: 'a.jpg', type: 'image' },
        { url: 'https://wx2.sinaimg.cn/large/b.jpg', filename: 'b.jpg', type: 'image' },
      ]),
    ).resolves.toBe(3072)

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'media-head',
      url: 'https://wx1.sinaimg.cn/large/a.jpg',
    })
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'media-head',
      url: 'https://wx2.sinaimg.cn/large/b.jpg',
    })
  })

  it('limits concurrent media-head requests when estimating total size', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const pending: Array<(value: { ok: true; size: number }) => void> = []

    const sendMessage = vi.fn(() => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      return new Promise<{ ok: true; size: number }>((resolve) => {
        pending.push((value) => {
          inFlight--
          resolve(value)
        })
      })
    })

    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        runtime: {
          sendMessage,
        },
      },
    })

    const urls = Array.from({ length: 8 }, (_, i) => ({
      url: `https://wx1.sinaimg.cn/large/${i}.jpg`,
      filename: `${i}.jpg`,
      type: 'image' as const,
    }))

    const done = estimateTotalSize(urls)

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(5)
    })
    expect(maxInFlight).toBeLessThanOrEqual(5)

    const firstBatch = pending.splice(0, pending.length)
    for (const resolve of firstBatch) {
      resolve({ ok: true, size: 100 })
    }

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(8)
    })

    const secondBatch = pending.splice(0, pending.length)
    for (const resolve of secondBatch) {
      resolve({ ok: true, size: 100 })
    }

    await expect(done).resolves.toBe(800)
    expect(maxInFlight).toBeLessThanOrEqual(5)
  })

  it('应该通过 background 代理下载媒体并生成 zip', async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      contentType: 'image/jpeg',
      data: Buffer.from('image-bytes').toString('base64'),
    })
    const createObjectURL = vi.fn().mockReturnValue('blob:zip')
    const revokeObjectURL = vi.fn()
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation(() => 1 as unknown as ReturnType<typeof window.setTimeout>)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        runtime: {
          sendMessage,
        },
      },
    })
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: revokeObjectURL,
    })

    const result = await downloadAsZip(
      [{ url: 'https://wx1.sinaimg.cn/large/a.jpg', filename: 'a.jpg', type: 'image' }],
      'media.zip',
    )

    expect(result).toEqual({ successCount: 1, failCount: 0 })
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'media-fetch',
      url: 'https://wx1.sinaimg.cn/large/a.jpg',
    })
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)

    const revoke = setTimeoutSpy.mock.calls[0]?.[0]
    if (typeof revoke === 'function') {
      revoke()
    }
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:zip')

    click.mockRestore()
  })

  it('应该在主图下载失败时尝试候选 URL', async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'media-fetch-failed:403' })
      .mockResolvedValueOnce({
        ok: true,
        contentType: 'image/jpeg',
        data: Buffer.from('fallback-image-bytes').toString('base64'),
      })
    const createObjectURL = vi.fn().mockReturnValue('blob:zip')
    const revokeObjectURL = vi.fn()
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation(() => 1 as unknown as ReturnType<typeof window.setTimeout>)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        runtime: {
          sendMessage,
        },
      },
    })
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: revokeObjectURL,
    })

    await expect(
      downloadAsZip(
        [
          {
            url: 'https://wx1.sinaimg.cn/large/a.jpg',
            fallbackUrls: [
              'https://wx1.sinaimg.cn/large/a.jpg',
              'https://wx1.sinaimg.cn/orj1080/a.jpg',
            ],
            filename: 'a.jpg',
            type: 'image',
          },
        ],
        'media.zip',
      ),
    ).resolves.toEqual({ successCount: 1, failCount: 0 })

    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'media-fetch',
      url: 'https://wx1.sinaimg.cn/large/a.jpg',
    })
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'media-fetch',
      url: 'https://wx1.sinaimg.cn/orj1080/a.jpg',
    })
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)

    const revoke = setTimeoutSpy.mock.calls[0]?.[0]
    if (typeof revoke === 'function') {
      revoke()
    }
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:zip')

    click.mockRestore()
  })

  it('应该在主图过大时继续尝试候选 URL', async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'media-fetch-too-large' })
      .mockResolvedValueOnce({
        ok: true,
        contentType: 'image/jpeg',
        data: Buffer.from('fallback-image-bytes').toString('base64'),
      })
    const createObjectURL = vi.fn().mockReturnValue('blob:zip')
    const revokeObjectURL = vi.fn()
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation(() => 1 as unknown as ReturnType<typeof window.setTimeout>)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        runtime: {
          sendMessage,
        },
      },
    })
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: revokeObjectURL,
    })

    await expect(
      downloadAsZip(
        [
          {
            url: 'https://wx1.sinaimg.cn/large/a.jpg',
            fallbackUrls: ['https://wx1.sinaimg.cn/orj1080/a.jpg'],
            filename: 'a.jpg',
            type: 'image',
          },
        ],
        'media.zip',
      ),
    ).resolves.toEqual({ successCount: 1, failCount: 0 })

    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'media-fetch',
      url: 'https://wx1.sinaimg.cn/large/a.jpg',
    })
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'media-fetch',
      url: 'https://wx1.sinaimg.cn/orj1080/a.jpg',
    })
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)

    const revoke = setTimeoutSpy.mock.calls[0]?.[0]
    if (typeof revoke === 'function') {
      revoke()
    }
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:zip')

    click.mockRestore()
  })
})
