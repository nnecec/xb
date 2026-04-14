'use client'

import { createPlayer } from '@videojs/react'
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video'
import { MediaPlayer } from 'dashjs'
import type { MediaPlayerClass } from 'dashjs'
import { useEffect, useRef, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FeedDashSource } from '@/features/weibo/models/feed'

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
  const [useNativeFallback, setUseNativeFallback] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)

  qualityRef.current = qualityId

  const showDash = Boolean(dash && !useNativeFallback)
  const videoSrc = showDash ? undefined : progressiveSrc || undefined

  useEffect(() => {
    setUseNativeFallback(false)
    setQualityId('auto')
    setShouldLoad(false)
  }, [progressiveSrc, dash?.manifestXml])

  useEffect(() => {
    if (!showDash || !shouldLoad) {
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

    const manifestXml = dash?.manifestXml?.trim()
    if (!manifestXml) {
      if (progressiveSrc.trim()) {
        setUseNativeFallback(true)
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

    const onError = () => {
      if (progressiveSrc.trim()) {
        setUseNativeFallback(true)
      }
    }

    const onStreamInit = () => {
      streamInitRef.current = true
      applyVideoQuality(player, qualityRef.current as 'auto' | string)
    }

    player.on(MediaPlayer.events.ERROR, onError)
    player.on(MediaPlayer.events.STREAM_INITIALIZED, onStreamInit)
    player.attachSource(url)

    return () => {
      streamInitRef.current = false
      player.off(MediaPlayer.events.ERROR, onError)
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
  }, [showDash, dash?.manifestXml, progressiveSrc, shouldLoad])

  useEffect(() => {
    const p = playerRef.current
    if (!p || !showDash || !streamInitRef.current) {
      return
    }
    applyVideoQuality(p, qualityId as 'auto' | string)
  }, [qualityId, showDash])

  return (
    <div className="relative h-full w-full">
      <Player.Provider>
        <MinimalVideoSkin poster={poster}>
          <Video
            key={showDash ? 'dash' : `progressive-${progressiveSrc}`}
            ref={videoRef}
            src={videoSrc}
            preload="none"
            playsInline
            onPointerDownCapture={() => {
              if (!shouldLoad) {
                setShouldLoad(true)
              }
            }}
            onPlay={() => {
              if (!shouldLoad) {
                setShouldLoad(true)
              }
            }}
          />
        </MinimalVideoSkin>
        {dash && showDash ? (
          <div className="pointer-events-auto absolute right-4 top-4 z-20 max-w-[min(100%,12rem)]">
            <Select value={qualityId} onValueChange={setQualityId}>
              <SelectTrigger
                size="sm"
                className="h-8 border-border/80 bg-background/90 text-xs shadow-sm"
              >
                <SelectValue placeholder="清晰度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动</SelectItem>
                {dash.qualities.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </Player.Provider>
    </div>
  )
}
