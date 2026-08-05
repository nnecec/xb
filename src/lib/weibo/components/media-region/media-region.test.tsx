import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import type { FeedItem } from '@/lib/weibo/models/feed'

import { MediaRegion } from './media-region'
import type { MediaGalleryItem } from './media-region-model'

const { imageCarouselMock, inlineVideoPanelMock } = vi.hoisted(() => ({
  imageCarouselMock: vi.fn(),
  inlineVideoPanelMock: vi.fn(),
}))

vi.mock('@/lib/weibo/components/image-carousel', () => ({
  ImageCarousel: (props: {
    items: MediaGalleryItem[]
    initialStripIndex: number
    onStripIndexChange: (index: number) => void
    onVideoActivate: (
      video: Extract<MediaGalleryItem, { kind: 'video' }>['video'],
      index: number,
    ) => void
  }) => {
    imageCarouselMock(props)
    const video = props.items.find(
      (entry): entry is Extract<MediaGalleryItem, { kind: 'video' }> => entry.kind === 'video',
    )
    return (
      <button
        type="button"
        data-testid="gallery-video"
        data-media-video-id={video?.id}
        onClick={() => {
          if (!video) return
          props.onStripIndexChange(1)
          props.onVideoActivate(video.video, 1)
        }}
      >
        视频缩略图
      </button>
    )
  },
}))

vi.mock('./inline-video-panel', () => ({
  InlineVideoPanel: ({
    video,
    sessionId,
    onBack,
    onPlay,
    onPictureInPictureChange,
  }: {
    video: { id: string }
    sessionId: string
    onBack?: () => void
    onPlay?: () => void
    onPictureInPictureChange?: (active: boolean) => void
  }) => {
    inlineVideoPanelMock({ video, sessionId, onBack, onPlay, onPictureInPictureChange })
    return (
      <div data-testid="inline-video">
        {video.id}
        {onPlay ? (
          <button type="button" onClick={onPlay}>
            播放视频
          </button>
        ) : null}
        {onPictureInPictureChange ? (
          <button type="button" onClick={() => onPictureInPictureChange(true)}>
            进入画中画
          </button>
        ) : null}
        {onPictureInPictureChange ? (
          <button type="button" onClick={() => onPictureInPictureChange(false)}>
            退出画中画
          </button>
        ) : null}
        {onBack ? (
          <button type="button" onClick={onBack}>
            返回媒体区域
          </button>
        ) : null}
      </div>
    )
  },
}))

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
    {
      type: 'pic',
      id: 'image-2',
      image: {
        id: 'image-2',
        thumbnailUrl: 'https://example.com/thumb-2.jpg',
        largeUrl: 'https://example.com/large-2.jpg',
      },
    },
  ],
} satisfies FeedItem

describe('MediaRegion', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    resetAppSettingsStoreForTest()
    imageCarouselMock.mockClear()
    inlineVideoPanelMock.mockClear()
  })

  it('uses one collapsed media region for the complete ordered sequence', () => {
    getAppSettingsStore().setState({ weiboCardMediaDisplay: 'collapsed' })
    render(<MediaRegion item={item} />)

    expect(screen.getByRole('button', { name: /此微博包含 2 项媒体/ })).toBeInTheDocument()
    expect(imageCarouselMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /此微博包含 2 项媒体/ }))
    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ kind: 'video', id: 'video-1' }),
          expect.objectContaining({ kind: 'image', id: 'image-2' }),
        ],
      }),
    )
  })

  it('replaces a mixed gallery with inline video and restores its position on back', () => {
    render(<MediaRegion item={item} />)

    fireEvent.click(screen.getByTestId('gallery-video'))
    expect(screen.queryByTestId('gallery-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('inline-video')).toHaveTextContent('video-1')

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '返回媒体区域' }))
    })

    expect(screen.getByTestId('gallery-video')).toBeInTheDocument()
    expect(screen.queryByTestId('inline-video')).not.toBeInTheDocument()
    expect(imageCarouselMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialStripIndex: 1 }),
    )
  })

  it('keeps the playback session mounted while returning from an active PiP video', () => {
    render(<MediaRegion item={item} />)

    fireEvent.click(screen.getByTestId('gallery-video'))
    fireEvent.click(screen.getByRole('button', { name: '进入画中画' }))
    fireEvent.click(screen.getByRole('button', { name: '返回媒体区域' }))

    expect(screen.getByTestId('gallery-video')).toBeInTheDocument()
    expect(screen.getByTestId('inline-video')).toHaveAttribute('data-testid', 'inline-video')
    expect(screen.getByTestId('inline-video').parentElement).toHaveAttribute(
      'data-media-playback-retained',
      '',
    )

    fireEvent.click(screen.getByText('退出画中画'))
    expect(screen.queryByTestId('inline-video')).not.toBeInTheDocument()
  })

  it('renders a single playable video directly and reports its first play', () => {
    const onOpen = vi.fn()
    render(
      <MediaRegion
        item={{
          ...item,
          mixMediaInfo: [
            {
              type: 'video',
              id: 'single-video',
              videoStreamUrl: 'https://example.com/single.mp4',
            },
          ],
        }}
        onOpen={onOpen}
      />,
    )

    expect(screen.getByTestId('inline-video')).toHaveTextContent('single-video')
    expect(inlineVideoPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'status-1:single-video:video' }),
    )
    expect(screen.queryByRole('button', { name: '返回媒体区域' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '播放视频' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
