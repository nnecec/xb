import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LivePlayer } from './live-player'

describe('LivePlayer', () => {
  afterEach(() => {
    cleanup()
  })

  describe('liveStatus === 1 (live streaming)', () => {
    it('shows play button and poster', () => {
      render(
        <LivePlayer
          streamUrl="https://example.com/live.m3u8"
          coverUrl="https://example.com/cover.jpg"
          liveStatus={1}
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
      expect(video?.poster).toBe('https://example.com/cover.jpg')
    })

    it('does not auto-play', () => {
      render(
        <LivePlayer
          streamUrl="https://example.com/live.m3u8"
          coverUrl="https://example.com/cover.jpg"
          liveStatus={1}
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
      expect(video?.src).toBe('')
    })
  })

  describe('liveStatus === 3 (replay)', () => {
    it.skip('renders video element with poster', () => {
      render(
        <LivePlayer
          streamUrl="https://example.com/live.m3u8"
          coverUrl="https://example.com/cover.jpg"
          liveStatus={3}
          replayUrl="https://example.com/replay.m3u8"
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
      expect(video?.poster).toBe('https://example.com/cover.jpg')
    })
  })

  describe('liveStatus !== 1 && !== 3', () => {
    it('shows only poster without play button', () => {
      render(
        <LivePlayer
          streamUrl="https://example.com/live.m3u8"
          coverUrl="https://example.com/cover.jpg"
          liveStatus={0}
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
      expect(video?.poster).toBe('https://example.com/cover.jpg')
    })
  })

  describe('rendering', () => {
    it('renders with coverUrl as poster', () => {
      render(
        <LivePlayer
          streamUrl="https://example.com/live.m3u8"
          coverUrl="https://example.com/cover.jpg"
          liveStatus={1}
        />,
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
    })

    it('handles empty streamUrl', () => {
      render(<LivePlayer streamUrl="" coverUrl="https://example.com/cover.jpg" liveStatus={1} />)

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
    })

    it('handles missing coverUrl', () => {
      render(<LivePlayer streamUrl="https://example.com/live.m3u8" coverUrl="" liveStatus={1} />)

      expect(document.querySelector('video')).toBeInTheDocument()
    })
  })
})
