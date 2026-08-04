import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

import { FeedMediaBlock } from './feed-card-media'

vi.mock('../media-player/audio-player', () => ({
  AudioPlayerComponent: () => <div />,
}))

vi.mock('../media-player/live-player', () => ({
  LivePlayer: () => <div />,
}))

vi.mock('../media-player/video-player', () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}))

const videoItem = {
  id: 'status-1',
  mblogId: 'status-1',
  isLongText: false,
  author: {
    id: 'author-1',
    name: '作者',
    avatarUrl: null,
  },
  text: '正文',
  createdAt: '2026-08-01T00:00:00.000Z',
  createdAtLabel: '刚刚',
  stats: { likes: 0, comments: 0, reposts: 0 },
  images: [],
  media: {
    type: 'video',
    title: '视频',
    streamUrl: 'https://example.com/video.mp4',
    coverUrl: 'https://example.com/video.jpg',
    videoOrientation: 'horizontal',
  },
  mixMediaInfo: [],
} satisfies FeedItem

describe('FeedMediaBlock', () => {
  it('limits a standalone video to its configured maximum width', () => {
    const { container } = render(<FeedMediaBlock item={videoItem} maxWidth={760} />)

    expect(container.firstElementChild).toHaveClass('w-full')
    expect(container.firstElementChild).toHaveStyle({ maxWidth: '760px' })
  })
})
