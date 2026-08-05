import { describe, expect, it } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

import { buildMediaGroups } from './media-region-model'

const item = {
  id: 'status-1',
  mblogId: 'status-1',
  isLongText: false,
  author: { id: 'author-1', name: '作者', avatarUrl: null },
  text: '正文',
  createdAt: '2026-08-01T00:00:00.000Z',
  createdAtLabel: '刚刚',
  stats: { likes: 0, comments: 0, reposts: 0 },
  images: [
    {
      id: 'image-1',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      largeUrl: 'https://example.com/large.jpg',
    },
  ],
  media: null,
  mixMediaInfo: [
    {
      type: 'video',
      id: 'video-1',
      videoStreamUrl: 'https://example.com/video.mp4',
    },
  ],
} satisfies FeedItem

const options = {
  imageDisplay: 'expanded' as const,
  videoDisplay: 'expanded' as const,
  audioDisplay: 'expanded' as const,
  singleImageMaxWidth: 520,
  singleVideoMaxWidth: 760,
}

describe('buildMediaGroups', () => {
  it('normalizes a combined image and video region in source order', () => {
    const groups = buildMediaGroups(item, options)

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      kind: 'gallery',
      display: 'expanded',
      summary: '此微博包含 2 项媒体',
      items: [
        { kind: 'image', id: 'image-1' },
        { kind: 'video', id: 'video-1' },
      ],
    })
  })

  it('splits image and video groups when their display policies differ', () => {
    const groups = buildMediaGroups(item, { ...options, videoDisplay: 'collapsed' })

    expect(groups).toMatchObject([
      { kind: 'gallery', display: 'expanded', items: [{ kind: 'image', id: 'image-1' }] },
      { kind: 'gallery', display: 'collapsed', items: [{ kind: 'video', id: 'video-1' }] },
    ])
  })

  it('keeps standalone live media separate from gallery assets', () => {
    const groups = buildMediaGroups(
      {
        ...item,
        media: {
          type: 'live',
          title: '直播',
          streamUrl: 'https://example.com/live.m3u8',
          coverUrl: null,
        },
      },
      options,
    )

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      kind: 'standalone',
      summary: '此微博包含直播或回放',
    })
    expect(groups[1]).toMatchObject({ kind: 'gallery' })
  })
})
