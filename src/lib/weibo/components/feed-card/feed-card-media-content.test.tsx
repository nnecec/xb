import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

import { FeedCardMediaContent } from './feed-card-media-content'

const { feedMediaBlockMock, imageCarouselMock } = vi.hoisted(() => ({
  feedMediaBlockMock: vi.fn(),
  imageCarouselMock: vi.fn(),
}))

vi.mock('@/lib/weibo/components/image-carousel', () => ({
  ImageCarousel: (props: Record<string, unknown>) => {
    imageCarouselMock(props)
    return <div data-testid="image-carousel" />
  },
}))

vi.mock('./feed-card-media', () => ({
  FeedMediaBlock: (props: Record<string, unknown>) => {
    feedMediaBlockMock(props)
    return <div data-testid="feed-media-block" />
  },
}))

const item = {
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
      videoCoverUrl: 'https://example.com/video.jpg',
      videoOrientation: 'horizontal',
    },
  ],
} satisfies FeedItem

describe('FeedCardMediaContent', () => {
  beforeEach(() => {
    feedMediaBlockMock.mockClear()
    imageCarouselMock.mockClear()
  })

  it('opts combined card media into card layout preferences', () => {
    render(
      <FeedCardMediaContent
        item={item}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(screen.getAllByTestId('image-carousel')).toHaveLength(1)
    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ kind: 'image', id: 'image-1' }),
          expect.objectContaining({ kind: 'video', id: 'video-1' }),
        ],
        variant: 'card',
        singleMediaMaxWidth: undefined,
      }),
    )
  })

  it('keeps card layout preferences when image and video visibility are split', () => {
    render(
      <FeedCardMediaContent
        item={item}
        imageDisplay="expanded"
        videoDisplay="collapsed"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(screen.getAllByTestId('image-carousel')).toHaveLength(1)
    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ kind: 'image', id: 'image-1' })],
        variant: 'card',
      }),
    )
  })

  it('applies the single image width only when the status has one media item', () => {
    const singleImageItem: FeedItem = {
      ...item,
      mixMediaInfo: [],
    }

    render(
      <FeedCardMediaContent
        item={singleImageItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({ singleMediaMaxWidth: 520 }),
    )
  })

  it('applies the single image width to a Live Photo', () => {
    const livePhotoItem: FeedItem = {
      ...item,
      images: [
        {
          id: 'live-photo-1',
          thumbnailUrl: 'https://example.com/live-photo-thumb.jpg',
          largeUrl: 'https://example.com/live-photo-large.jpg',
          type: 'livephoto',
          livePhotoVideoUrl: 'https://example.com/live-photo.mov',
        },
      ],
      mixMediaInfo: [],
    }

    render(
      <FeedCardMediaContent
        item={livePhotoItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({ singleMediaMaxWidth: 520 }),
    )
  })

  it('applies the matching width to a single mixed-media picture or video', () => {
    const singleMixedPictureItem: FeedItem = {
      ...item,
      images: [],
      mixMediaInfo: [
        {
          type: 'pic',
          id: 'mixed-picture-1',
          image: {
            id: 'mixed-picture-1',
            thumbnailUrl: 'https://example.com/mixed-picture-thumb.jpg',
            largeUrl: 'https://example.com/mixed-picture-large.jpg',
          },
        },
      ],
    }

    const { rerender } = render(
      <FeedCardMediaContent
        item={singleMixedPictureItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(imageCarouselMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ singleMediaMaxWidth: 520 }),
    )

    const singleMixedVideoItem: FeedItem = {
      ...item,
      images: [],
      mixMediaInfo: [
        {
          type: 'video',
          id: 'mixed-video-1',
          videoCoverUrl: 'https://example.com/mixed-video.jpg',
          videoStreamUrl: 'https://example.com/mixed-video.mp4',
          videoOrientation: 'horizontal',
        },
      ],
    }

    rerender(
      <FeedCardMediaContent
        item={singleMixedVideoItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(imageCarouselMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ singleMediaMaxWidth: 760 }),
    )
  })

  it('passes the single video width to the standalone video block', () => {
    const singleVideoItem: FeedItem = {
      ...item,
      images: [],
      mixMediaInfo: [],
      media: {
        type: 'video',
        title: '视频',
        streamUrl: 'https://example.com/video.mp4',
        coverUrl: 'https://example.com/video.jpg',
        videoOrientation: 'horizontal',
      },
    }

    render(
      <FeedCardMediaContent
        item={singleVideoItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(feedMediaBlockMock).toHaveBeenCalledWith(expect.objectContaining({ maxWidth: 760 }))
  })

  it('does not apply a single-media width when standalone and mixed media coexist', () => {
    const multipleMediaItem: FeedItem = {
      ...item,
      images: [],
      media: {
        type: 'video',
        title: '独立视频',
        streamUrl: 'https://example.com/standalone-video.mp4',
        coverUrl: 'https://example.com/standalone-video.jpg',
        videoOrientation: 'horizontal',
      },
      mixMediaInfo: [
        {
          type: 'video',
          id: 'mixed-video-1',
          videoCoverUrl: 'https://example.com/mixed-video.jpg',
          videoStreamUrl: 'https://example.com/mixed-video.mp4',
          videoOrientation: 'horizontal',
        },
      ],
    }

    render(
      <FeedCardMediaContent
        item={multipleMediaItem}
        imageDisplay="expanded"
        videoDisplay="expanded"
        audioDisplay="expanded"
        singleImageMaxWidth={520}
        singleVideoMaxWidth={760}
        downloadFilename="status"
      />,
    )

    expect(feedMediaBlockMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxWidth: undefined }),
    )
    expect(imageCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({ singleMediaMaxWidth: undefined }),
    )
  })

  it.each(['live', 'audio', 'podcast_audio'] as const)(
    'does not apply the single video width to %s media',
    (type) => {
      const excludedMediaItem: FeedItem = {
        ...item,
        images: [],
        media: {
          type,
          title: type,
          streamUrl: `https://example.com/${type}.mp4`,
          coverUrl: `https://example.com/${type}.jpg`,
        },
        mixMediaInfo: [],
      }

      render(
        <FeedCardMediaContent
          item={excludedMediaItem}
          imageDisplay="expanded"
          videoDisplay="expanded"
          audioDisplay="expanded"
          singleImageMaxWidth={520}
          singleVideoMaxWidth={760}
          downloadFilename="status"
        />,
      )

      expect(feedMediaBlockMock).toHaveBeenCalledWith(
        expect.objectContaining({ maxWidth: undefined }),
      )
    },
  )
})
