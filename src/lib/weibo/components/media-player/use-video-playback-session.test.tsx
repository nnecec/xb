import { cleanup, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type VideoPlaybackMode, useVideoPlaybackSession } from './use-video-playback-session'
import {
  getPlaybackPositionStore,
  resetPlaybackPositionStoreForTest,
} from './video-playback-position-store'

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

function PlaybackSessionProbe({ sessionId, mode }: { sessionId: string; mode: VideoPlaybackMode }) {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const session = useVideoPlaybackSession({ mediaRef, sessionId, mode })
  return (
    <>
      <video
        ref={mediaRef}
        data-testid={sessionId}
        onLoadedMetadata={session.handleLoadedMetadata}
      />
      <button
        type="button"
        data-testid={`${sessionId}-prepare`}
        onClick={session.prepareSourceChange}
      >
        切换播放源
      </button>
    </>
  )
}

describe('useVideoPlaybackSession', () => {
  beforeEach(() => {
    resetPlaybackPositionStoreForTest()
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps only one video playback session active at a time', () => {
    const { getByTestId } = render(
      <>
        <PlaybackSessionProbe sessionId="first" mode="video" />
        <PlaybackSessionProbe sessionId="second" mode="live" />
      </>,
    )
    const first = getByTestId('first') as HTMLVideoElement
    const second = getByTestId('second') as HTMLVideoElement
    const firstPause = vi.fn()
    Object.defineProperty(first, 'pause', { configurable: true, value: firstPause })

    first.dispatchEvent(new Event('play'))
    second.dispatchEvent(new Event('play'))

    expect(firstPause).toHaveBeenCalledTimes(1)
  })

  it('does not restore an on-demand position into a live session', () => {
    getPlaybackPositionStore().getState().savePosition('live-session', 32, 120)
    const { getByTestId } = render(<PlaybackSessionProbe sessionId="live-session" mode="live" />)
    const video = getByTestId('live-session') as HTMLVideoElement
    let currentTime = 0
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value: number) => {
        currentTime = value
      },
    })
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })

    fireEvent.loadedMetadata(video)

    expect(currentTime).toBe(0)
  })

  it('preserves playback continuity while a variant source changes', () => {
    const { getByTestId } = render(<PlaybackSessionProbe sessionId="video-session" mode="video" />)
    const video = getByTestId('video-session') as HTMLVideoElement
    let currentTime = 42
    let playbackRate = 1.5
    const play = vi.fn(async () => {})
    Object.defineProperties(video, {
      currentTime: {
        configurable: true,
        get: () => currentTime,
        set: (value: number) => {
          currentTime = value
        },
      },
      duration: { configurable: true, value: 120 },
      paused: { configurable: true, value: false },
      pause: { configurable: true, value: vi.fn() },
      playbackRate: {
        configurable: true,
        get: () => playbackRate,
        set: (value: number) => {
          playbackRate = value
        },
      },
      play: { configurable: true, value: play },
    })

    fireEvent.click(getByTestId('video-session-prepare'))
    currentTime = 0
    playbackRate = 1
    fireEvent.loadedMetadata(video)

    expect(currentTime).toBe(42)
    expect(playbackRate).toBe(1.5)
    expect(play).toHaveBeenCalledTimes(1)
  })
})
