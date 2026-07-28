import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VideoPlayer } from './video-player'

vi.mock('@reactuses/core', () => ({
  useIntersectionObserver: vi.fn(),
  useInterval: vi.fn(),
}))

vi.mock('@/lib/app-settings-store', () => ({
  useAppSettings: (
    selector: (state: {
      rememberPlaybackRate: boolean
      playbackRate: number
      updateSettings: ReturnType<typeof vi.fn>
    }) => unknown,
  ) =>
    selector({
      rememberPlaybackRate: false,
      playbackRate: 1,
      updateSettings: vi.fn(),
    }),
  useShallow: (selector: unknown) => selector,
}))

describe('VideoPlayer', () => {
  it('does not render a hover time preview on the progress bar', () => {
    Object.defineProperty(CSS, 'supports', {
      configurable: true,
      value: vi.fn(() => false),
    })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )

    render(<VideoPlayer progressiveSrc="https://example.com/video.mp4" />)

    expect(document.querySelector('.media-slider__preview')).not.toBeInTheDocument()
    expect(document.querySelector('.video-time-preview')).not.toBeInTheDocument()
  })
})
