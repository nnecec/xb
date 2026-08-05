import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VideoPlayer } from './video-player'

const videoPlayerCss = readFileSync(
  join(process.cwd(), 'src/lib/weibo/components/media-player/video-player.css'),
  'utf8',
)

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
  it('uses the controls visibility attribute emitted by videojs', () => {
    expect(videoPlayerCss).toContain('.media-controls--root:not([data-visible])')
    expect(videoPlayerCss).not.toContain('data-user-active')
    expect(videoPlayerCss).not.toContain('.media-controls:not([data-visible])')
  })

  it('renders the Video.js skin hierarchy without a hover time preview', () => {
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

    const controlsRoot = document.querySelector('.media-controls--root')
    expect(controlsRoot).toHaveAttribute('data-visible')
    expect(controlsRoot?.querySelector('.media-controls--primary')).toBeInTheDocument()
    expect(document.querySelector('.media-slider__preview')).not.toBeInTheDocument()
    expect(document.querySelector('.video-time-preview')).not.toBeInTheDocument()
  })
})
