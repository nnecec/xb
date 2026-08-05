import { describe, expect, it } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

import { buildMediaAssets, buildMediaRegionModel } from './media-region-model'

const baseItem = {
  id: 'status-1',
  mblogId: 'status-1',
  isLongText: false,
  author: { id: 'author-1', name: '作者', avatarUrl: null },
  text: '正文',
  createdAt: '2026-08-01T00:00:00.000Z',
  createdAtLabel: '刚刚',
  stats: { likes: 0, comments: 0, reposts: 0 },
  images: [],
  media: null,
} satisfies FeedItem

const widths = { singleImageMaxWidth: 520, singleVideoMaxWidth: 760 }

describe('media region model', () => {
  it('uses a non-empty mixed sequence as the sole source and preserves its order', () => {
    const assets = buildMediaAssets({
      ...baseItem,
      images: [
        {
          id: 'ordinary-image',
          thumbnailUrl: 'https://example.com/ordinary-thumb.jpg',
          largeUrl: 'https://example.com/ordinary.jpg',
        },
      ],
      media: {
        type: 'video',
        title: '独立视频',
        streamUrl: 'https://example.com/standalone.mp4',
        coverUrl: null,
      },
      mixMediaInfo: [
        {
          type: 'video',
          id: 'video-1',
          videoStreamUrl: 'https://example.com/video.mp4',
        },
        {
          type: 'pic',
          id: 'image-1',
          image: {
            id: 'image-1',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            largeUrl: 'https://example.com/large.jpg',
          },
        },
      ],
    })

    expect(assets).toMatchObject([
      { kind: 'video', id: 'video-1', playable: true },
      { kind: 'image', id: 'image-1' },
    ])
  })

  it('keeps preview-only videos visible, keeps source-only videos playable, and omits empty assets', () => {
    const assets = buildMediaAssets({
      ...baseItem,
      mixMediaInfo: [
        { type: 'video', id: 'preview-only', videoCoverUrl: 'https://example.com/cover.jpg' },
        { type: 'video', id: 'source-only', videoStreamUrl: 'https://example.com/video.mp4' },
        { type: 'video', id: 'empty' },
        { type: 'pic', id: 'missing-image' },
      ],
    })

    expect(assets).toMatchObject([
      { id: 'preview-only', playable: false },
      { id: 'source-only', playable: true },
    ])
  })

  it('deduplicates stable identities without changing the first occurrence', () => {
    const assets = buildMediaAssets({
      ...baseItem,
      mixMediaInfo: [
        { type: 'video', id: 'same', videoCoverUrl: 'https://example.com/first.jpg' },
        { type: 'video', id: 'same', videoStreamUrl: 'https://example.com/second.mp4' },
      ],
    })

    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({ id: 'same', playable: false })
  })

  it('builds one summary and applies the matching single-asset width', () => {
    const imageRegion = buildMediaRegionModel(
      {
        ...baseItem,
        images: [
          {
            id: 'image-1',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            largeUrl: 'https://example.com/large.jpg',
          },
        ],
      },
      widths,
    )
    const mixedRegion = buildMediaRegionModel(
      {
        ...baseItem,
        mixMediaInfo: [
          { type: 'video', id: 'video-1', videoStreamUrl: 'https://example.com/video.mp4' },
          {
            type: 'pic',
            id: 'image-1',
            image: {
              id: 'image-1',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              largeUrl: 'https://example.com/large.jpg',
            },
          },
        ],
      },
      widths,
    )

    expect(imageRegion).toMatchObject({
      summary: '此微博包含 1 张图片',
      singleMediaMaxWidth: 520,
    })
    expect(mixedRegion).toMatchObject({ summary: '此微博包含 2 项媒体' })
    expect(mixedRegion?.singleMediaMaxWidth).toBeUndefined()
  })

  it('applies the single video width to standalone video media', () => {
    const region = buildMediaRegionModel(
      {
        ...baseItem,
        media: {
          type: 'video',
          title: '视频',
          streamUrl: 'https://example.com/video.mp4',
          coverUrl: null,
        },
      },
      widths,
    )

    expect(region?.singleMediaMaxWidth).toBe(760)
  })

  it('returns no media region when no valid asset remains', () => {
    expect(
      buildMediaRegionModel(
        { ...baseItem, mixMediaInfo: [{ type: 'video', id: 'empty' }] },
        widths,
      ),
    ).toBeNull()
  })
})
