'use client'

import { createPlayer } from '@videojs/react'
import { liveVideoFeatures } from '@videojs/react/live-video'
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'
import { Video, videoFeatures } from '@videojs/react/video'
import { Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FeedDashSource } from '@/lib/weibo/models/feed'

import { useInlineFullscreen } from './inline-fullscreen'
import { VideoPlayerSkin } from './video-player-skin'
import {
  applyStoredVideoVolume,
  registerVideoVolumeElement,
  rememberVideoVolumeFromElement,
} from './video-volume-store'

import '@videojs/react/video/skin.css'
import './video-player.css'

const LivePlayerContext = createPlayer({ features: [...liveVideoFeatures] })
const ReplayPlayerContext = createPlayer({ features: [...videoFeatures] })

interface LivePlayerProps {
  streamUrl: string
  coverUrl: string
  liveStatus: number
  replayUrl?: string
  dash?: FeedDashSource
}

function LiveOverlay({ isPlaying, onPlay }: { isPlaying: boolean; onPlay: () => void }) {
  if (isPlaying) {
    return null
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <button type="button" className="group flex items-center justify-center" onClick={onPlay}>
        <div className="flex size-14 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.96] [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02]">
          <Play className="ml-1 size-7 fill-current text-black" />
        </div>
      </button>
    </div>
  )
}

export function LivePlayer({ streamUrl, coverUrl, liveStatus, replayUrl = '' }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [inlineFullscreen, setInlineFullscreen] = useState(false)

  const isLive = liveStatus === 1
  const isReplay = liveStatus === 3

  const handlePointerDown = useCallback(() => {
    if (isLive) {
      setShouldLoad(true)
    }
  }, [isLive])

  const handlePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setShouldLoad(true)
    applyStoredVideoVolume(video)
    void video.play().catch(() => {})
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      applyStoredVideoVolume(videoRef.current)
      videoRef.current.currentTime = 0
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const unregister = registerVideoVolumeElement(video)
    const handleVolumeChange = () => {
      rememberVideoVolumeFromElement(video)
    }

    video.addEventListener('volumechange', handleVolumeChange)
    return () => {
      unregister()
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [isLive, isReplay, streamUrl, replayUrl])

  useInlineFullscreen(videoRef, inlineFullscreen, () => setInlineFullscreen(false))

  if (!isLive && !isReplay) {
    return (
      <div className="relative h-full w-full">
        <ReplayPlayerContext.Provider>
          <VideoPlayerSkin mode="live" controlsVisible={false} centerPlayVisible={false}>
            {/* data-xb-media-* 用于外部脚本定位本扩展挂载的媒体元素,kind 标记直播/回放/不可用三种状态 */}
            <Video
              src={undefined}
              poster={coverUrl}
              preload="none"
              playsInline
              data-xb-media-video="true"
              data-xb-media-kind="live-unavailable"
            />
          </VideoPlayerSkin>
        </ReplayPlayerContext.Provider>
      </div>
    )
  }

  const PlayerContext = isLive ? LivePlayerContext : ReplayPlayerContext

  return (
    <div className="relative h-full w-full">
      <PlayerContext.Provider>
        <VideoPlayerSkin
          mode={isLive ? 'live' : 'replay'}
          controlsVisible={isReplay || shouldLoad}
          centerPlayVisible={false}
          inlineFullscreen={{
            active: inlineFullscreen,
            onToggle: () => setInlineFullscreen((active) => !active),
          }}
        >
          <HlsJsVideo
            ref={videoRef}
            src={isReplay ? replayUrl : streamUrl}
            poster={coverUrl}
            preload={isLive ? 'none' : 'metadata'}
            playsInline
            streamType={isLive ? 'live' : 'on-demand'}
            data-xb-media-video="true"
            data-xb-media-kind={isReplay ? 'live-replay' : 'live'}
            onPointerDownCapture={isReplay ? undefined : handlePointerDown}
            onLoadedMetadata={handleLoadedMetadata}
          />
          {isLive && !shouldLoad && <LiveOverlay isPlaying={false} onPlay={handlePlay} />}
        </VideoPlayerSkin>
      </PlayerContext.Provider>
    </div>
  )
}
