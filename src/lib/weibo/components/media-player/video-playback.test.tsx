import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchVideoBlob, VideoPlayback } from './video-playback'
import { resetPlaybackPositionStoreForTest } from './video-playback-position-store'
import { isVideoPlaybackActive } from './video-player-skin'
import {
  VideoDownloadMenu,
  VideoPlaybackRateMenuContent,
  VideoQualityMenu,
} from './video-settings-menu'

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

const originalRuntimeSendMessage = browser.runtime.sendMessage

describe('VideoPlayback', () => {
  beforeEach(() => {
    resetPlaybackPositionStoreForTest()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Object.assign(browser.runtime, { sendMessage: originalRuntimeSendMessage })
  })

  it('keeps controls mounted before on-demand playback starts so hover can reveal them', () => {
    expect(videoPlayerCss).toContain(
      '.media-default-skin--video[data-playback-idle]:not(:hover):not(:focus-within)',
    )
    expect(videoPlayerCss).toContain('@media (hover: hover) and (pointer: fine)')
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
    expect(document.querySelector('.media-controls--root')).toBeInTheDocument()
    expect(document.querySelector('.media-default-skin--video')).toHaveAttribute(
      'data-playback-idle',
    )

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

  it('detects active playback for the center play state', () => {
    expect(isVideoPlaybackActive(null)).toBe(false)
    expect(isVideoPlaybackActive({ started: false, paused: true, ended: false })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: true, ended: false })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: false, ended: true })).toBe(false)
    expect(isVideoPlaybackActive({ started: true, paused: false, ended: false })).toBe(true)
  })

  it('shows quality as a standalone control with every available resolution', async () => {
    render(
      <VideoQualityMenu
        quality={{
          value: 'dash_2160p60',
          options: [
            { id: 'dash_2160p60', label: '4K60', preferenceKey: '4K60' },
            { id: 'dash_1440p60', label: '2K60', preferenceKey: '2K60' },
            { id: 'dash_1080p60', label: '1080P60', preferenceKey: '1080P60' },
            { id: 'dash_1080p', label: '1080p', preferenceKey: '1080p' },
            { id: 'dash_720p', label: '720p', preferenceKey: '720p' },
            { id: 'dash_hd', label: '480p', preferenceKey: '480p' },
          ],
          onValueChange: vi.fn(),
        }}
      />,
    )

    const trigger = screen.getByRole('button', { name: '清晰度：4K60' })
    expect(trigger).toHaveTextContent('4K60')
    fireEvent.click(trigger)

    expect(await screen.findByText('2K60')).toBeInTheDocument()
    expect(
      screen.getAllByRole('menuitemradio', { hidden: true }).map((option) => option.textContent),
    ).toEqual(['4K60', '2K60', '1080P60', '1080p', '720p', '480p'])
  })

  it('offers video downloads as a standalone control', async () => {
    const onSelect = vi.fn()
    render(
      <VideoDownloadMenu
        download={{
          options: [
            { id: '1080p', label: '超清' },
            { id: '720p', label: '高清' },
          ],
          onSelect,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '下载视频' }))
    fireEvent.click(await screen.findByText('超清'))

    expect(onSelect).toHaveBeenCalledWith('1080p')
    expect(screen.queryByRole('button', { name: '播放设置' })).not.toBeInTheDocument()
  })

  it('shows playback rate as a standalone control', async () => {
    const setValue = vi.fn()
    render(
      <VideoPlaybackRateMenuContent
        playbackRate={{
          value: '1',
          setValue,
          options: [
            { value: '0.5', rate: 0.5, label: '0.5x', disabled: false },
            { value: '1', rate: 1, label: '1x', disabled: false },
            { value: '2', rate: 2, label: '2x', disabled: false },
          ],
        }}
      />,
    )

    const playbackRateButton = screen.getByRole('button', { name: '播放速度：1x' })
    expect(playbackRateButton).toHaveTextContent(/^1x$/)
    expect(playbackRateButton).toHaveClass(
      'media-button',
      'media-button--subtle',
      'media-button--playback-rate-trigger',
    )
    expect(playbackRateButton).not.toHaveClass('media-button--playback-rate')
    fireEvent.click(playbackRateButton)
    fireEvent.click(await screen.findByText('2x'))

    expect(setValue).toHaveBeenCalledWith('2')
    expect(screen.queryByRole('button', { name: '播放设置' })).not.toBeInTheDocument()
  })

  it('downloads a video through the extension media proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('CORS'))
    const sendMessage = vi.fn(async () => ({
      ok: true,
      data: btoa('video'),
      contentType: 'video/mp4',
    }))
    Object.assign(browser.runtime, { sendMessage })
    const blob = await fetchVideoBlob('https://f.video.weibocdn.com/video.mp4')

    expect(fetchMock).toHaveBeenCalledWith('https://f.video.weibocdn.com/video.mp4')
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'media-fetch',
      url: 'https://f.video.weibocdn.com/video.mp4',
    })
    expect(blob.type).toBe('video/mp4')
    expect(blob.size).toBe(5)
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
