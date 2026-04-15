'use client'

import { createPlayer } from '@videojs/react'
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video'
import { MediaPlayer } from 'dashjs'
import type { MediaPlayerClass } from 'dashjs'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FeedDashSource, FeedPlaybackSource } from '@/features/weibo/models/feed'

import '@videojs/react/video/minimal-skin.css'

const Player = createPlayer({ features: [...videoFeatures] })

function applyVideoQuality(player: MediaPlayerClass, mode: 'auto' | string) {
  if (mode === 'auto') {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
    return
  }

  const hasTarget = player
    .getRepresentationsByType('video')
    .some((item) => String((item as { id?: string }).id ?? '') === mode)
  if (!hasTarget) {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
    return
  }

  try {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: false, audio: true } },
      },
    })
    player.setRepresentationForTypeById('video', mode, true)
  } catch {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
  }
}

interface VideoPlayerProps {
  progressiveSrc: string
  poster?: string
  dash?: FeedDashSource
}

export function VideoPlayer({ progressiveSrc, poster, dash }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<MediaPlayerClass | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const streamInitRef = useRef(false)
  const qualityRef = useRef('auto')
  const [qualityId, setQualityId] = useState('auto')
  const [shouldLoad, setShouldLoad] = useState(false)

  const dashType = dash?.type
  const playbackSource = dash?.type === 'playback' ? (dash as FeedPlaybackSource) : undefined
  const sources = useMemo(() => playbackSource?.sources ?? [], [playbackSource])
  const selectedIndex = playbackSource?.selectedIndex ?? 0

  const [currentSrc, setCurrentSrc] = useState(() => {
    if (dashType === 'playback' && sources.length > 0) {
      return sources[selectedIndex]?.url ?? progressiveSrc
    }
    return progressiveSrc
  })

  qualityRef.current = qualityId

  const isMpd = dashType === 'mpd'
  const isPlayback = dashType === 'playback'
  const showSelect = Boolean(isMpd || isPlayback)

  useEffect(() => {
    setQualityId('auto')
    setShouldLoad(false)
    if (dashType === 'playback' && sources.length > 0) {
      setCurrentSrc(sources[selectedIndex]?.url ?? progressiveSrc)
    }
  }, [progressiveSrc, dashType, sources, selectedIndex])

  useEffect(() => {
    if (dashType !== 'playback') {
      return
    }
    if (qualityId === 'auto') {
      setCurrentSrc(sources[selectedIndex]?.url ?? progressiveSrc)
    } else {
      const source = sources.find((s) => s.id === qualityId)
      setCurrentSrc(source?.url ?? sources[selectedIndex]?.url ?? progressiveSrc)
    }
  }, [qualityId, dashType, sources, selectedIndex, progressiveSrc])

  useEffect(() => {
    if (!isMpd || !shouldLoad) {
      streamInitRef.current = false
      if (playerRef.current) {
        try {
          playerRef.current.reset()
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const mpdDash = dash as { manifestXml?: string } | undefined
    const manifestXml = mpdDash?.manifestXml?.trim()
    if (!manifestXml) {
      streamInitRef.current = false
      if (playerRef.current) {
        try {
          playerRef.current.reset()
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      return
    }

    const player = MediaPlayer().create()
    playerRef.current = player
    streamInitRef.current = false

    player.initialize(video, undefined, false)
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })

    const blob = new Blob([manifestXml], { type: 'application/dash+xml' })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url

    const onStreamInit = () => {
      streamInitRef.current = true
      applyVideoQuality(player, qualityRef.current as 'auto' | string)
    }

    player.on(MediaPlayer.events.STREAM_INITIALIZED, onStreamInit)
    player.attachSource(url)

    return () => {
      streamInitRef.current = false
      player.off(MediaPlayer.events.STREAM_INITIALIZED, onStreamInit)
      try {
        player.reset()
        player.destroy()
      } catch {
        // ignore
      }
      playerRef.current = null
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [isMpd, dashType, shouldLoad, dash])

  useEffect(() => {
    const p = playerRef.current
    if (!p || !isMpd || !streamInitRef.current) {
      return
    }
    applyVideoQuality(p, qualityId as 'auto' | string)
  }, [qualityId, isMpd])

  const handlePointerDown = useCallback(() => {
    if (!shouldLoad) {
      setShouldLoad(true)
    }
  }, [shouldLoad])

  const handlePlay = useCallback(() => {
    if (!shouldLoad) {
      setShouldLoad(true)
    }
  }, [shouldLoad])

  const videoSrc = isMpd ? undefined : currentSrc || undefined

  return (
    <div className="relative h-full w-full">
      <Player.Provider>
        <MinimalVideoSkin poster={poster}>
          <Video
            key={
              isMpd ? 'dash' : isPlayback ? `playback-${currentSrc}` : `progressive-${currentSrc}`
            }
            ref={videoRef}
            src={videoSrc}
            preload="none"
            playsInline
            onPointerDownCapture={handlePointerDown}
            onPlay={handlePlay}
          />
        </MinimalVideoSkin>
        {showSelect && dash ? (
          <div className="pointer-events-auto absolute top-4 right-4 z-20 max-w-[min(100%,12rem)]">
            <Select value={qualityId} onValueChange={setQualityId}>
              <SelectTrigger
                size="sm"
                className="border-border/80 bg-background/90 h-8 text-xs shadow-sm"
              >
                <SelectValue placeholder="清晰度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动</SelectItem>
                {isMpd && 'qualities' in dash
                  ? dash.qualities.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.label}
                      </SelectItem>
                    ))
                  : isPlayback
                    ? sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))
                    : null}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </Player.Provider>
    </div>
  )
}
