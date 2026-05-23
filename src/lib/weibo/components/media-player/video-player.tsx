'use client'
import { useIntersectionObserver, useInterval } from '@reactuses/core'
import { selectPlaybackRate, selectPlayback } from '@videojs/core/dom'
import {
  AlertDialog,
  BufferingIndicator,
  Controls,
  createPlayer,
  ErrorDialog,
  FullscreenButton,
  Gesture,
  Hotkey,
  MuteButton,
  PiPButton,
  PlayButton,
  Popover,
  Time,
  TimeSlider,
  Tooltip,
  usePlayer,
  VolumeSlider,
} from '@videojs/react'
import { Video, videoFeatures } from '@videojs/react/video'
import { MediaPlayer } from 'dashjs'
import type { MediaPlayerClass } from 'dashjs'
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  PictureInPicture2,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  Expand,
  Shrink,
  Loader2,
  RotateCcw,
  Download,
} from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

import { getUiPortalContainer } from '@/components/ui/portal'
import { cn } from '@/lib/utils'
import type { FeedDashSource, FeedPlaybackSource } from '@/lib/weibo/models/feed'

import { getPlaybackPositionStore } from './video-playback-position-store'
import { registerPlayingVideo, unregisterPlayingVideo } from './video-playback-registry'

import '@videojs/react/video/skin.css'
import './video-player.css'

const { Provider: PlayerProvider, Container: PlayerContainer } = createPlayer({
  features: [...videoFeatures],
})

const AUTO_QUALITY_ID = 'auto'

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
}

interface QualityOption {
  id: string
  label: string
}

interface PlaybackResumeState {
  currentTime: number
  shouldResume: boolean
}

function formatPlaybackRate(rate: number) {
  return `${rate}x`
}

function applyVideoQuality(player: MediaPlayerClass, mode: string) {
  if (mode === AUTO_QUALITY_ID) {
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

function destroyDashPlayer(
  playerRef: RefObject<MediaPlayerClass | null>,
  blobUrlRef: RefObject<string | null>,
) {
  if (playerRef.current) {
    try {
      playerRef.current.reset()
      playerRef.current.destroy()
    } catch {
      // ignore destroy failures from dash internals
    }
    playerRef.current = null
  }

  if (blobUrlRef.current) {
    URL.revokeObjectURL(blobUrlRef.current)
    blobUrlRef.current = null
  }
}

const PlayerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { className?: string }
>(function PlayerButton({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('media-button media-button--subtle relative', className)}
      {...props}
    />
  )
})

const IconButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { className?: string }
>(function IconButton({ className, ...props }, ref) {
  return <PlayerButton ref={ref} className={cn('media-button--icon', className)} {...props} />
})

function VolumeControl() {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported')
  const muteButton = (
    <MuteButton
      className="media-button--mute"
      render={(props, state) => (
        <IconButton {...props}>
          {state.volumeLevel === 'off' ? (
            <VolumeX className="media-icon size-[18px]" />
          ) : state.volumeLevel === 'low' ? (
            <Volume1 className="media-icon size-[18px]" />
          ) : (
            <Volume2 className="media-icon size-[18px]" />
          )}
        </IconButton>
      )}
    />
  )

  if (volumeUnsupported) return muteButton

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  )
}

interface QualityControlProps {
  value: string
  qualities: QualityOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

function CenterPlayButton() {
  const playback = usePlayer(selectPlayback)

  return (
    <div className="video-center-play">
      <button
        type="button"
        className="video-center-play__button"
        onClick={() => playback?.togglePaused()}
        aria-label="播放"
      >
        <Play className="ml-0.5 size-7 fill-current" />
      </button>
    </div>
  )
}

function QualityControl({
  value,
  qualities,
  disabled = false,
  onValueChange,
}: QualityControlProps) {
  const [open, setOpen] = useState(false)
  const options = useMemo(() => [{ id: AUTO_QUALITY_ID, label: '自动' }, ...qualities], [qualities])

  const currentLabel = options.find((option) => option.id === value)?.label ?? '自动'

  return (
    <Popover.Root open={open} onOpenChange={setOpen} side="top" align="start">
      <Popover.Trigger
        disabled={disabled}
        render={(props) => (
          <PlayerButton
            {...props}
            className="font-medium tracking-[0.01em]"
            aria-label="选择清晰度"
          >
            {currentLabel}
          </PlayerButton>
        )}
      />
      <Popover.Popup className="media-surface media-popover rounded-2xl p-1.5">
        <div className="flex min-w-24 flex-col gap-1">
          {options.map((option) => {
            const active = option.id === value

            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'rounded-xl px-3 py-1.5 text-left text-xs transition-colors',
                  active ? 'bg-white/18 text-white' : 'hover:bg-white/10',
                )}
                onClick={() => {
                  onValueChange(option.id)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </Popover.Popup>
    </Popover.Root>
  )
}

function PlaybackRateControl() {
  const playbackRateState = usePlayer(selectPlaybackRate)

  if (!playbackRateState) {
    return null
  }

  const { playbackRate, playbackRates, setPlaybackRate } = playbackRateState
  const currentLabel = formatPlaybackRate(playbackRate)
  const disabled = playbackRates.length === 0

  return (
    <Popover.Root side="top" align="end">
      <Popover.Trigger
        disabled={disabled}
        render={(props) => (
          <IconButton {...props} aria-label="选择播放速率">
            {currentLabel}
          </IconButton>
        )}
      />
      <Popover.Popup className="media-surface media-popover rounded-2xl p-1.5">
        <div className="flex min-w-24 flex-col gap-1">
          {playbackRates.map((rate) => {
            const active = rate === playbackRate

            return (
              <button
                key={rate}
                type="button"
                className={cn(
                  'rounded-xl px-3 py-1.5 text-left text-xs transition-colors',
                  active ? 'bg-white/18 text-white' : 'hover:bg-white/10',
                )}
                onClick={() => {
                  setPlaybackRate(rate)
                }}
              >
                {formatPlaybackRate(rate)}
              </button>
            )
          })}
        </div>
      </Popover.Popup>
    </Popover.Root>
  )
}

function getPlaybackSrc({
  progressiveSrc,
  qualityId,
  selectedIndex,
  sources,
}: {
  progressiveSrc: string
  qualityId: string
  selectedIndex: number
  sources: FeedPlaybackSource['sources']
}) {
  if (sources.length === 0) {
    return progressiveSrc
  }

  if (qualityId !== AUTO_QUALITY_ID) {
    const source = sources.find((item) => item.id === qualityId)
    if (source?.url) {
      return source.url
    }
  }

  return sources[selectedIndex]?.url ?? sources[0]?.url ?? progressiveSrc
}

export function VideoPlayer({
  progressiveSrc,
  poster,
  dash,
  hideInlineFullScreen,
  downloadUrl,
  downloadFilename,
  onPlay,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<MediaPlayerClass | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const pendingPlaybackRef = useRef<PlaybackResumeState | null>(null)
  const streamInitRef = useRef(false)
  const qualityRef = useRef(AUTO_QUALITY_ID)

  const isInPiPRef = useRef(false)

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

  const portalTarget = useMemo(() => getUiPortalContainer(), [])

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
    const name = downloadFilename
      ? `${downloadFilename.replaceAll(/[\\/:*?"<>|]/g, '_')}.mp4`
      : 'weibo_video.mp4'
    toast.info(`准备下载：${name}`)
    try {
      // firefox doesn't support cors download, so we need to open a tab
      if (import.meta.env.FIREFOX) {
        try {
          const a = document.createElement('a')
          a.href = downloadUrl
          console.log('🚀 ~ VideoPlayer ~ downloadUrl:', downloadUrl)
          a.download = name
          a.target = '_blank'
          a.rel = 'noopener'
          document.body.appendChild(a)
          a.click()
          a.remove()
          toast.success(`已下载：${name}`)
        } catch (error) {
          console.error(error)
          toast.error('下载失败，请稍后重试')
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
        toast.success(`已下载：${name}`)
        a.remove()
      } catch (error) {
        console.error(error)
        toast.error('下载失败，请稍后重试')
      }
    } catch {
      toast.error('下载失败，请稍后重试')
    } finally {
      setDownloading(false)
    }
  }, [downloadUrl, downloading, downloadFilename])

  useEffect(() => {
    pendingPlaybackRef.current = null
    setQualityId(AUTO_QUALITY_ID)
    setShouldLoad(false)
  }, [sourceKey])

  // Pause video when it leaves the viewport (unless in Picture-in-Picture)
  useIntersectionObserver(
    videoRef,
    ([entry]) => {
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
    }
    const handleLeavePiP = () => {
      isInPiPRef.current = false
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handleStop)
    video.addEventListener('ended', handleStop)
    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      unregisterPlayingVideo(video)
      isInPiPRef.current = false
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handleStop)
      video.removeEventListener('ended', handleStop)
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [sourceKey])

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

  useEffect(() => {
    if (!inlineFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInlineFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inlineFullscreen])

  const handleToggleFullscreen = useCallback(() => {
    if (inlineFullscreen) {
      setInlineFullscreen(false)
      return
    }
    const video = videoRef.current
    if (!video) return
    pendingPlaybackRef.current = {
      currentTime: video.currentTime,
      shouldResume: !video.paused && !video.ended,
    }
    setInlineFullscreen(true)
  }, [inlineFullscreen])

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

    if (pendingPlayback.shouldResume) {
      void video.play().catch(() => {
        // ignore autoplay failures while restoring playback after quality switch
      })
    }

    pendingPlaybackRef.current = null
  }, [sourceKey])

  const playerContainer = (
    <PlayerContainer
      key={`player-${inlineFullscreen ? 'overlay' : 'inline'}`}
      className={cn(
        'media-default-skin media-default-skin--video h-full w-full overflow-hidden',
        !inlineFullscreen && 'relative rounded-[inherit]',
      )}
    >
      <Video
        key={isMpd ? 'dash-video' : 'html-video'}
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        preload="none"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onPointerDownCapture={ensureLoaded}
        onPlay={() => {
          ensureLoaded()
          onPlay?.()
        }}
      />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <div className="media-surface">
              <Loader2 className="media-icon size-[18px] animate-spin" />
            </div>
          </div>
        )}
      />

      <ErrorDialog.Root>
        <AlertDialog.Popup className="media-error">
          <div className="media-error__dialog media-surface">
            <div className="media-error__content">
              <AlertDialog.Title className="media-error__title">播放出错</AlertDialog.Title>
              <ErrorDialog.Description className="media-error__description" />
            </div>
            <div className="media-error__actions">
              <AlertDialog.Close
                className="media-button media-button--primary"
                onClick={() => {
                  const video = videoRef.current
                  if (video) {
                    video.load()
                  }
                }}
              >
                重试
              </AlertDialog.Close>
            </div>
          </div>
        </AlertDialog.Popup>
      </ErrorDialog.Root>

      <CenterPlayButton />

      <Controls.Root className="media-surface media-controls">
        <Tooltip.Provider>
          <div className="media-button-group">
            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PlayButton
                    className="media-button--play"
                    render={(props, state) => (
                      <IconButton {...props}>
                        <RotateCcw className="media-icon media-icon--restart size-[18px]" />
                        {state.paused || state.ended ? (
                          <Play className="media-icon media-icon--play size-[18px]" />
                        ) : (
                          <Pause className="media-icon media-icon--pause size-[18px]" />
                        )}
                      </IconButton>
                    )}
                  />
                }
              />
              <Tooltip.Popup className="media-surface media-tooltip">播放/暂停</Tooltip.Popup>
            </Tooltip.Root>

            {qualities.length > 0 ? (
              <QualityControl
                value={qualityId}
                qualities={qualities}
                disabled={!shouldLoad}
                onValueChange={handleQualityChange}
              />
            ) : null}

            {downloadUrl ? (
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDownload()
                      }}
                      aria-label="下载视频"
                      disabled={downloading}
                    >
                      <Download className="media-icon size-[18px]" />
                    </IconButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  {downloading ? '下载中…' : '下载视频'}
                </Tooltip.Popup>
              </Tooltip.Root>
            ) : null}
          </div>

          <div className="media-time-controls">
            <Time.Value type="current" className="media-time" />
            <TimeSlider.Root className="media-slider">
              <TimeSlider.Track className="media-slider__track">
                <TimeSlider.Fill className="media-slider__fill" />
                <TimeSlider.Buffer className="media-slider__buffer" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="media-slider__thumb" />
              <TimeSlider.Preview className="media-surface media-slider__preview">
                <TimeSlider.Value type="pointer" className="video-time-preview" />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value type="duration" className="media-time" />
          </div>

          <div className="media-button-group">
            <Tooltip.Root side="top">
              <Tooltip.Trigger render={<PlaybackRateControl />} />
              <Tooltip.Popup className="media-surface media-tooltip">播放速度</Tooltip.Popup>
            </Tooltip.Root>

            <VolumeControl />

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PiPButton
                    className="media-button--pip"
                    render={(props, state) => (
                      <IconButton
                        {...props}
                        aria-label={state.pip ? '退出画中画' : '进入画中画'}
                        disabled={state.availability !== 'available'}
                      >
                        {state.pip ? (
                          <PictureInPicture className="media-icon size-[18px]" />
                        ) : (
                          <PictureInPicture2 className="media-icon size-[18px]" />
                        )}
                      </IconButton>
                    )}
                  />
                }
              />

              <Tooltip.Popup className="media-surface media-tooltip">画中画</Tooltip.Popup>
            </Tooltip.Root>

            {!hideInlineFullScreen && (
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <IconButton
                      onClick={handleToggleFullscreen}
                      aria-label={inlineFullscreen ? '退出网页内全屏' : '网页内全屏'}
                    >
                      {inlineFullscreen ? (
                        <Shrink className="media-icon size-[18px]" />
                      ) : (
                        <Expand className="media-icon size-[18px]" />
                      )}
                    </IconButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">网页全屏</Tooltip.Popup>
              </Tooltip.Root>
            )}

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <FullscreenButton
                    className="media-button--fullscreen"
                    render={(props, state) => (
                      <IconButton {...props}>
                        {state.fullscreen ? (
                          <Minimize className="media-icon size-[18px]" />
                        ) : (
                          <Maximize className="media-icon size-[18px]" />
                        )}
                      </IconButton>
                    )}
                  />
                }
              />
              <Tooltip.Popup className="media-surface media-tooltip">全屏</Tooltip.Popup>
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className="media-overlay" />

      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Hotkey keys="ArrowRight" action="seekStep" value={5} />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-5} />
      <Hotkey keys="l" action="seekStep" value={10} />
      <Hotkey keys="j" action="seekStep" value={-10} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />

      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" value={-10} region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" value={10} region="right" />
    </PlayerContainer>
  )

  return (
    <PlayerProvider>
      {inlineFullscreen && portalTarget
        ? createPortal(
            <div className="bg-background fixed inset-0 z-[2147483647] flex items-center justify-center">
              {playerContainer}
            </div>,
            portalTarget,
          )
        : playerContainer}
    </PlayerProvider>
  )
}
