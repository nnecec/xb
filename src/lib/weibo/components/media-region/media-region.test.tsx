import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MediaRegion } from './media-region'
import type { MediaGalleryItem } from './media-region-model'

const { imageCarouselMock } = vi.hoisted(() => ({ imageCarouselMock: vi.fn() }))

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
      (item): item is Extract<MediaGalleryItem, { kind: 'video' }> => item.kind === 'video',
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
  InlineVideoPanel: ({ video, onBack }: { video: { id: string }; onBack: () => void }) => (
    <div data-testid="inline-video">
      {video.id}
      <button type="button" onClick={onBack}>
        返回媒体画廊
      </button>
    </div>
  ),
}))

const items: MediaGalleryItem[] = [
  {
    kind: 'image',
    id: 'image-1',
    image: {
      id: 'image-1',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      largeUrl: 'https://example.com/large.jpg',
    },
  },
  {
    kind: 'video',
    id: 'video-1',
    video: {
      type: 'video',
      id: 'video-1',
      videoStreamUrl: 'https://example.com/video.mp4',
    },
  },
]

describe('MediaRegion', () => {
  it('replaces the gallery with inline video and restores its position on back', () => {
    render(<MediaRegion items={items} />)

    fireEvent.click(screen.getByTestId('gallery-video'))
    expect(screen.queryByTestId('gallery-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('inline-video')).toHaveTextContent('video-1')

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '返回媒体画廊' }))
    })

    expect(screen.getByTestId('gallery-video')).toBeInTheDocument()
    expect(imageCarouselMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialStripIndex: 1 }),
    )
  })
})
