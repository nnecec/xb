import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('leaves controls visibility and overlay state to the official skin', () => {
    expect(videoPlayerCss).not.toContain('.media-controls--root:not([data-visible])')
    expect(videoPlayerCss).not.toContain('data-user-active')
    expect(videoPlayerCss).not.toContain('.media-controls:not([data-visible])')
  })

  it('renders the official primary and secondary control groups', () => {
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

    render(
      <VideoPlayer
        progressiveSrc="https://example.com/video.mp4"
        downloadUrl="https://example.com/download.mp4"
        dash={{
          type: 'playback',
          selectedIndex: 0,
          sources: [
            { id: 'sd', label: '标清', url: 'https://example.com/video-sd.mp4' },
            { id: 'hd', label: '高清', url: 'https://example.com/video-hd.mp4' },
          ],
        }}
      />,
    )

    const controlsRoot = document.querySelector('.media-controls--root')
    const primary = controlsRoot?.querySelector('.media-controls--primary')
    const secondary = controlsRoot?.querySelector('.media-controls--secondary')

    expect(controlsRoot).toHaveAttribute('data-visible')
    expect(primary).toBeInTheDocument()
    expect(secondary).toBeInTheDocument()
    expect(primary?.querySelector('[aria-label="下载视频"]')).toBeInTheDocument()
    expect(primary?.querySelector('[aria-label="播放设置"]')).toBeInTheDocument()
    expect(primary?.querySelector('[aria-label="选择清晰度"]')).not.toBeInTheDocument()
    expect(primary?.querySelector('.media-button--pip')).not.toBeInTheDocument()
    expect(secondary?.querySelector('[aria-label="网页内全屏"]')).toBeInTheDocument()
    expect(document.querySelector('.media-slider__preview')).not.toBeInTheDocument()
    expect(document.querySelector('.video-time-preview')).not.toBeInTheDocument()
  })

  it('opens and closes the official settings menu', async () => {
    render(
      <VideoPlayer
        progressiveSrc="https://example.com/video.mp4"
        dash={{
          type: 'playback',
          selectedIndex: 0,
          sources: [{ id: 'hd', label: '高清', url: 'https://example.com/video-hd.mp4' }],
        }}
      />,
    )

    const trigger = screen.getByRole('button', { name: '播放设置' })
    fireEvent.click(trigger)

    const menu = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('.media-menu--settings')
      expect(element).toBeInTheDocument()
      return element!
    })

    fireEvent.keyDown(menu, { key: 'Escape' })
    await waitFor(() => {
      expect(document.querySelector('.media-menu--settings')).not.toBeInTheDocument()
    })
  })

  it('reports native Picture-in-Picture transitions without owning the player skin', () => {
    const onPictureInPictureChange = vi.fn()
    render(
      <VideoPlayer
        progressiveSrc="https://example.com/video.mp4"
        onPictureInPictureChange={onPictureInPictureChange}
      />,
    )

    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    video?.dispatchEvent(new Event('enterpictureinpicture'))
    video?.dispatchEvent(new Event('leavepictureinpicture'))

    expect(onPictureInPictureChange).toHaveBeenNthCalledWith(1, true)
    expect(onPictureInPictureChange).toHaveBeenNthCalledWith(2, false)
  })
})
