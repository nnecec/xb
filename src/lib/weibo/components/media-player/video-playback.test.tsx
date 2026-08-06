import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VideoPlayback } from './video-playback'
import { resetPlaybackPositionStoreForTest } from './video-playback-position-store'
import { isVideoPlaybackActive } from './video-player-skin'
import { VideoSettingsMenu } from './video-settings-menu'

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

describe('VideoPlayback', () => {
  beforeEach(() => {
    resetPlaybackPositionStoreForTest()
  })

  afterEach(() => {
    cleanup()
  })

  it('hides controls before on-demand playback starts', () => {
    expect(videoPlayerCss).not.toContain('.media-controls--root:not([data-visible])')
    expect(videoPlayerCss).not.toContain('restart state handled by bottom bar')

    render(
      <VideoPlayback
        media={{
          kind: 'video',
          sessionId: 'status-1:video-1:video',
          src: 'https://example.com/video.mp4',
        }}
        download={{ url: 'https://example.com/download.mp4' }}
      />,
    )

    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(document.querySelector('.media-controls--root')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
  })

  it('keeps live controls hidden until playback starts', () => {
    render(
      <VideoPlayback
        media={{
          kind: 'live',
          sessionId: 'status-1:live',
          src: 'https://example.com/live.m3u8',
          poster: 'https://example.com/cover.jpg',
        }}
      />,
    )

    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video?.poster).toBe('https://example.com/cover.jpg')
    expect(document.querySelector('.media-controls--root')).not.toBeInTheDocument()

    fireEvent.pointerDown(video!)
    expect(document.querySelector('.media-controls--root')).not.toBeInTheDocument()
  })

  it('shows controls only while playback is active', () => {
    expect(isVideoPlaybackActive(null)).toBe(false)
    expect(isVideoPlaybackActive({ started: false, paused: true, ended: false })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: true, ended: false })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: false, ended: true })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: false, ended: false })).toBe(true)
  })

  it('keeps quality selection in the settings menu when alternatives are available', () => {
    render(
      <VideoSettingsMenu
        allowPlaybackRate={false}
        quality={{
          value: '360p',
          options: [
            { id: '360p', label: '流畅' },
            { id: '720p', label: '高清' },
          ],
          onValueChange: vi.fn(),
        }}
      />,
    )

    expect(screen.getByRole('button', { name: '播放设置' })).toBeInTheDocument()
  })

  it('renders an unavailable live asset without interactive controls', () => {
    render(
      <VideoPlayback
        media={{
          kind: 'unavailable',
          sessionId: 'status-1:live-unavailable',
          poster: 'https://example.com/cover.jpg',
        }}
      />,
    )

    expect(document.querySelector('video')).toHaveAttribute(
      'poster',
      'https://example.com/cover.jpg',
    )
    expect(document.querySelector('.media-controls--root')).not.toBeInTheDocument()
  })

  it('restores an on-demand position when the same playback session remounts', async () => {
    const { unmount } = render(
      <VideoPlayback
        media={{ kind: 'video', sessionId: 'status-1:video-1:video', src: 'video.mp4' }}
      />,
    )
    const firstVideo = document.querySelector('video')!
    let firstTime = 18
    Object.defineProperty(firstVideo, 'currentTime', {
      configurable: true,
      get: () => firstTime,
      set: (value: number) => {
        firstTime = value
      },
    })
    Object.defineProperty(firstVideo, 'duration', { configurable: true, value: 120 })
    fireEvent.pause(firstVideo)
    unmount()

    render(
      <VideoPlayback
        media={{ kind: 'video', sessionId: 'status-1:video-1:video', src: 'video.mp4' }}
      />,
    )
    const secondVideo = document.querySelector('video')!
    let secondTime = 0
    Object.defineProperty(secondVideo, 'currentTime', {
      configurable: true,
      get: () => secondTime,
      set: (value: number) => {
        secondTime = value
      },
    })
    Object.defineProperty(secondVideo, 'duration', { configurable: true, value: 120 })
    fireEvent.loadedMetadata(secondVideo)

    await waitFor(() => expect(secondTime).toBe(18))
  })

  it('reports native Picture-in-Picture transitions through the session seam', () => {
    const onPictureInPictureChange = vi.fn()
    render(
      <VideoPlayback
        media={{ kind: 'video', sessionId: 'status-1:video-1:video', src: 'video.mp4' }}
        onPictureInPictureChange={onPictureInPictureChange}
      />,
    )

    const video = document.querySelector('video')!
    fireEvent(video, new Event('enterpictureinpicture'))
    fireEvent(video, new Event('leavepictureinpicture'))

    expect(onPictureInPictureChange).toHaveBeenNthCalledWith(1, true)
    expect(onPictureInPictureChange).toHaveBeenNthCalledWith(2, false)
  })
})
