'use client'
import { useIntersectionObserver, useInterval } from '@reactuses/core'
import { createPlayer } from '@videojs/react'
import { Video, videoFeatures } from '@videojs/react/video'
import { MediaPlayer } from 'dashjs'
import type { MediaPlayerClass } from 'dashjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import type { FeedDashSource } from '@/lib/weibo/models/feed'
import { sanitizeFilename } from '@/lib/weibo/utils/filename'

import { useInlineFullscreen } from './inline-fullscreen'
import { getPlaybackPositionStore } from './video-playback-position-store'
import {
  exitVideoPictureInPicture,
  registerPlayingVideo,
  unregisterPlayingVideo,
} from './video-playback-registry'
import {
  AUTO_QUALITY_ID,
  applyVideoQuality,
  destroyDashPlayer,
  getPlaybackSrc,
  type PlaybackResumeState,
  type QualityOption,
} from './video-player-dash'
import { VideoPlayerSkin } from './video-player-skin'
import {
  applyStoredVideoVolume,
  registerVideoVolumeElement,
  rememberVideoVolumeFromElement,
} from './video-volume-store'

import '@videojs/react/video/skin.css'
import './video-player.css'

const { Provider: PlayerProvider } = createPlayer({
  features: [...videoFeatures],
})

interface VideoPlayerProps {
  progressiveSrc: string
  poster?: string
  dash?: FeedDashSource
  videoOrientation?: 'vertical' | 'horizontal'
  hideInlineFullScreen?: boolean
  downloadUrl?: string
  /** Used to generate the downloaded filename: "作者名+前15个字.mp4" */
  downloadFilename?: string
  onPlay?: () => void
  onPictureInPictureChange?: (active: boolean) => void
}

export function VideoPlayer({
  progressiveSrc,
  poster,
  dash,
  hideInlineFullScreen,
  downloadUrl,
  downloadFilename,
  onPlay,
  onPictureInPictureChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<MediaPlayerClass | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const pendingPlaybackRef = useRef<PlaybackResumeState | null>(null)
  const streamInitRef = useRef(false)
  const qualityRef = useRef(AUTO_QUALITY_ID)

  const isInPiPRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (!video) return
      if (!video.paused) video.pause()
      void exitVideoPictureInPicture(video)
    }
  }, [])

  const { rememberPlaybackRate, savedPlaybackRate, updateSettings } = useAppSettings(
    useShallow((s) => ({
      rememberPlaybackRate: s.rememberPlaybackRate,
      savedPlaybackRate: s.playbackRate,
      updateSettings: s.updateSettings,
    })),
  )

  const savedPlaybackRateRef = useRef(savedPlaybackRate)
  const rememberEnabledRef = useRef(rememberPlaybackRate)
  const lastWrittenRateRef = useRef(savedPlaybackRate)
  const appliedFromSettingsRef = useRef(false)

  useEffect(() => {
    savedPlaybackRateRef.current = savedPlaybackRate
    lastWrittenRateRef.current = savedPlaybackRate
  }, [savedPlaybackRate])

  useEffect(() => {
    rememberEnabledRef.current = rememberPlaybackRate
  }, [rememberPlaybackRate])

  const [qualityId, setQualityId] = useState(AUTO_QUALITY_ID)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [inlineFullscreen, setInlineFullscreen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isMpd = dash?.type === 'mpd'
  const playbackSource = dash?.type === 'playback' ? dash : undefined
  const sources = playbackSource?.sources ?? []
  const selectedIndex = playbackSource?.selectedIndex ?? 0
  const manifestXml = dash?.type === 'mpd' ? dash.manifestXml.trim() : ''
  const playbackSourceKey = sources.map((item) => `${item.id}:${item.url}`).join('|')
  const sourceKey = useMemo(() => {
    if (dash?.type === 'mpd') {
      return `mpd:${manifestXml}`
    }

    if (dash?.type === 'playback') {
      return `playback:${selectedIndex}:${playbackSourceKey}`
    }

    return `progressive:${progressiveSrc}`
  }, [dash?.type, manifestXml, playbackSourceKey, progressiveSrc, selectedIndex])

  qualityRef.current = qualityId

  const qualities: QualityOption[] =
    dash?.type === 'mpd'
      ? dash.qualities
      : playbackSource
        ? playbackSource.sources.map((source) => ({ id: source.id, label: source.label }))
        : []

  const videoSrc = isMpd
    ? undefined
    : playbackSource
      ? getPlaybackSrc({ progressiveSrc, qualityId, selectedIndex, sources })
      : progressiveSrc

  const handleDownload = useCallback(async () => {
    if (!downloadUrl || downloading) {
      return
    }

    setDownloading(true)
    const name = downloadFilename ? `${sanitizeFilename(downloadFilename)}.mp4` : 'weibo_video.mp4'
    toast.info(`准备下载：${name}`)
    try {
      // firefox doesn't support cors download, so we need to open a tab
      if (import.meta.env.FIREFOX) {
        try {
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = name
          a.target = '_blank'
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          toast.success(`视频已下载：${name}`)
        } catch {
          toast.error('视频下载失败，请稍后再试')
        }
        return
      }
      try {
        const res = await fetch(downloadUrl)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = name
        a.click()
        URL.revokeObjectURL(blobUrl)
        toast.success(`视频已下载：${name}`)
        a.remove()
      } catch {
        toast.error('视频下载失败，请稍后再试')
      }
    } catch {
      toast.error('视频下载失败，请稍后再试')
    } finally {
      setDownloading(false)
    }
  }, [downloadUrl, downloading, downloadFilename])

  useEffect(() => {
    pendingPlaybackRef.current = null
    appliedFromSettingsRef.current = false
    setQualityId(AUTO_QUALITY_ID)
    setShouldLoad(false)
  }, [sourceKey])

  // Pause video when it leaves the viewport (unless in Picture-in-Picture)
  useIntersectionObserver(
    videoRef,
    ([entry]) => {
      if (!entry) return
      const video = videoRef.current
      if (video && !entry.isIntersecting && !video.paused && !video.ended && !isInPiPRef.current) {
        video.pause()
      }
    },
    { threshold: 0 },
  )

  // Save playback position on pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePause = () => {
      const store = getPlaybackPositionStore()
      if (video.currentTime > 1 && Number.isFinite(video.duration) && video.duration > 0) {
        store.getState().savePosition(sourceKey, video.currentTime, video.duration)
      }
    }

    video.addEventListener('pause', handlePause)
    return () => {
      video.removeEventListener('pause', handlePause)
    }
  }, [sourceKey])

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
  }, [sourceKey])

  // Persist user-driven playback rate changes (covers videojs setPlaybackRate,
  // keyboard `<`/`>` hotkeys, and any direct assignment to video.playbackRate).
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleRateChange = () => {
      if (!rememberEnabledRef.current) return
      // Suppress writes while a quality switch is restoring a saved rate.
      if (pendingPlaybackRef.current != null) return
      const next = video.playbackRate
      if (!Number.isFinite(next) || next <= 0) return
      if (Math.abs(next - lastWrittenRateRef.current) < 0.001) return
      lastWrittenRateRef.current = next
      void updateSettings({ playbackRate: next })
    }

    video.addEventListener('ratechange', handleRateChange)
    return () => {
      video.removeEventListener('ratechange', handleRateChange)
    }
  }, [sourceKey, updateSettings])

  // Save playback position periodically during playback (every 5 seconds)
  useInterval(() => {
    const video = videoRef.current
    if (video && !video.paused && !video.ended) {
      const store = getPlaybackPositionStore()
      if (video.currentTime > 1 && Number.isFinite(video.duration) && video.duration > 0) {
        store.getState().savePosition(sourceKey, video.currentTime, video.duration)
      }
    }
  }, 5000)

  // Remove saved position when video ends naturally
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnded = () => {
      const store = getPlaybackPositionStore()
      store.getState().removePosition(sourceKey)
    }

    video.addEventListener('ended', handleEnded)
    return () => {
      video.removeEventListener('ended', handleEnded)
    }
  }, [sourceKey])

  // Global singleton: when this video starts playing, pause any other
  // video that is already playing (and exit its Picture-in-Picture mode).
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      registerPlayingVideo(video)
    }

    const handleStop = () => {
      unregisterPlayingVideo(video)
    }

    // Track PiP state via native events (document.pictureInPictureElement is
    // unavailable when the video lives inside a shadow root).
    const handleEnterPiP = () => {
      isInPiPRef.current = true
      onPictureInPictureChange?.(true)
    }
    const handleLeavePiP = () => {
      isInPiPRef.current = false
      onPictureInPictureChange?.(false)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handleStop)
    video.addEventListener('ended', handleStop)
    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      unregisterPlayingVideo(video)
      isInPiPRef.current = false
      onPictureInPictureChange?.(false)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handleStop)
      video.removeEventListener('ended', handleStop)
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [onPictureInPictureChange, sourceKey])

  useEffect(() => {
    if (!isMpd || !shouldLoad || !manifestXml) {
      streamInitRef.current = false
      destroyDashPlayer(playerRef, blobUrlRef)
      return
    }

    const video = videoRef.current
    if (!video) {
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

    const handleStreamInit = () => {
      streamInitRef.current = true
      applyVideoQuality(player, qualityRef.current)
    }

    player.on(MediaPlayer.events.STREAM_INITIALIZED, handleStreamInit)
    player.attachSource(url)

    return () => {
      streamInitRef.current = false
      player.off(MediaPlayer.events.STREAM_INITIALIZED, handleStreamInit)
      destroyDashPlayer(playerRef, blobUrlRef)
    }
  }, [isMpd, manifestXml, shouldLoad])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !isMpd || !streamInitRef.current) {
      return
    }

    applyVideoQuality(player, qualityId)
  }, [isMpd, qualityId])

  useInlineFullscreen(videoRef, inlineFullscreen, () => setInlineFullscreen(false))

  const ensureLoaded = useCallback(() => {
    setShouldLoad(true)
  }, [])

  function handleQualityChange(nextQualityId: string) {
    if (nextQualityId === qualityId) {
      return
    }

    if (playbackSource && shouldLoad) {
      const currentPlaybackSrc = getPlaybackSrc({
        progressiveSrc,
        qualityId,
        selectedIndex,
        sources,
      })
      const nextPlaybackSrc = getPlaybackSrc({
        progressiveSrc,
        qualityId: nextQualityId,
        selectedIndex,
        sources,
      })

      if (currentPlaybackSrc !== nextPlaybackSrc) {
        const video = videoRef.current

        if (video) {
          pendingPlaybackRef.current = {
            currentTime: video.currentTime,
            playbackRate: video.playbackRate,
            shouldResume: !video.paused && !video.ended,
          }
        }
      }
    }

    setQualityId(nextQualityId)
  }

  const handleLoadedMetadata = useCallback(() => {
    const pendingPlayback = pendingPlaybackRef.current
    const video = videoRef.current

    if (!video) {
      return
    }

    applyStoredVideoVolume(video)

    // Restore playback position from store (only when NOT a quality switch)
    if (!pendingPlayback) {
      const store = getPlaybackPositionStore()
      const saved = store.getState().getPosition(sourceKey)
      if (saved && saved.currentTime > 1 && Number.isFinite(video.duration)) {
        const seekTo = Math.min(saved.currentTime, video.duration - 0.5)
        if (seekTo > 1) {
          video.currentTime = seekTo
        }
      }
    }

    // Apply remembered playback rate on first load (skipped when a quality
    // switch is restoring prior rate via pendingPlayback below).
    if (!pendingPlayback && !appliedFromSettingsRef.current && rememberEnabledRef.current) {
      const target = savedPlaybackRateRef.current
      if (Number.isFinite(target) && target > 0) {
        video.playbackRate = target
        lastWrittenRateRef.current = target
        appliedFromSettingsRef.current = true
      }
    }

    // Existing: restore after quality switch
    if (!pendingPlayback) {
      return
    }

    if (Number.isFinite(pendingPlayback.currentTime)) {
      const duration = Number.isFinite(video.duration)
        ? Math.max(video.duration - 0.25, 0)
        : pendingPlayback.currentTime
      video.currentTime = Math.min(pendingPlayback.currentTime, duration)
    }

    if (Number.isFinite(pendingPlayback.playbackRate) && pendingPlayback.playbackRate > 0) {
      video.playbackRate = pendingPlayback.playbackRate
    }

    if (pendingPlayback.shouldResume) {
      void video.play().catch(() => {
        // ignore autoplay failures while restoring playback after quality switch
      })
    }

    pendingPlaybackRef.current = null
  }, [sourceKey])

  return (
    <PlayerProvider>
      <VideoPlayerSkin
        quality={
          qualities.length > 0
            ? {
                value: qualityId,
                options: qualities,
                disabled: !shouldLoad,
                onValueChange: handleQualityChange,
              }
            : undefined
        }
        download={
          downloadUrl
            ? {
                loading: downloading,
                onSelect: () => void handleDownload(),
              }
            : undefined
        }
        inlineFullscreen={
          hideInlineFullScreen
            ? undefined
            : {
                active: inlineFullscreen,
                onToggle: () => setInlineFullscreen((active) => !active),
              }
        }
        onRetry={() => videoRef.current?.load()}
      >
        {/* data-xb-media-* 用于外部脚本定位本扩展挂载的媒体元素(如全局播放协调) */}
        <Video
          key={isMpd ? 'dash-video' : 'html-video'}
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          preload="none"
          playsInline
          data-xb-media-video="true"
          data-xb-media-kind="video"
          onLoadedMetadata={handleLoadedMetadata}
          onPointerDownCapture={ensureLoaded}
          onPlay={() => {
            ensureLoaded()
            onPlay?.()
          }}
        />
      </VideoPlayerSkin>
    </PlayerProvider>
  )
}
