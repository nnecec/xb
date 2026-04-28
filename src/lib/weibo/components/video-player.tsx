'use client'

import { selectPlaybackRate } from '@videojs/core/dom'
import {
  createPlayer,
  Controls,
  FullscreenButton,
  MuteButton,
  PiPButton,
  Popover,
  PlayButton,
  Time,
  TimeSlider,
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
} from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'
import type { FeedDashSource, FeedPlaybackSource } from '@/lib/weibo/models/feed'

import '@videojs/react/video/skin.css'

const Player = createPlayer({ features: [...videoFeatures] })

const AUTO_QUALITY_ID = 'auto'

interface VideoPlayerProps {
  progressiveSrc: string
  poster?: string
  dash?: FeedDashSource
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
  playerRef: MutableRefObject<MediaPlayerClass | null>,
  blobUrlRef: MutableRefObject<string | null>,
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
  const [open, setOpen] = useState(false)
  const playbackRateState = usePlayer(selectPlaybackRate)

  if (!playbackRateState) {
    return null
  }

  const { playbackRate, playbackRates, setPlaybackRate } = playbackRateState
  const currentLabel = formatPlaybackRate(playbackRate)
  const disabled = playbackRates.length === 0

  return (
    <Popover.Root open={open} onOpenChange={setOpen} side="top" align="end">
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
                  setOpen(false)
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

export function VideoPlayer({ progressiveSrc, poster, dash }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<MediaPlayerClass | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const pendingPlaybackRef = useRef<PlaybackResumeState | null>(null)
  const streamInitRef = useRef(false)
  const qualityRef = useRef(AUTO_QUALITY_ID)

  const [qualityId, setQualityId] = useState(AUTO_QUALITY_ID)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [inlineFullscreen, setInlineFullscreen] = useState(false)

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

  useEffect(() => {
    pendingPlaybackRef.current = null
    setQualityId(AUTO_QUALITY_ID)
    setShouldLoad(false)
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
    const container = videoRef.current?.closest('.media-default-skin--video')
    if (!container) {
      return
    }

    const el = container as HTMLElement
    if (inlineFullscreen) {
      el.style.position = 'fixed'
      el.style.inset = '0'
      el.style.zIndex = '9999'
      el.style.width = '100vw'
      el.style.height = '100vh'

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setInlineFullscreen(false)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        el.style.position = ''
        el.style.inset = ''
        el.style.zIndex = ''
        el.style.width = ''
        el.style.height = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      el.style.position = ''
      el.style.inset = ''
      el.style.zIndex = ''
      el.style.width = ''
      el.style.height = ''
    }
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

    if (!pendingPlayback || !video) {
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
  }, [])

  return (
    <div className="relative h-full w-full">
      <Player.Provider>
        <Player.Container className="media-default-skin media-default-skin--video relative h-full w-full overflow-hidden rounded-[inherit]">
          <Video
            key={isMpd ? 'dash-video' : 'html-video'}
            ref={videoRef}
            src={videoSrc}
            poster={poster}
            preload="none"
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onPointerDownCapture={ensureLoaded}
            onPlay={ensureLoaded}
          />
          <Controls.Root className="media-surface media-controls">
            <div className="media-button-group">
              <PlayButton
                className="media-button--play"
                render={(props, state) => (
                  <IconButton {...props}>
                    {state.paused || state.ended ? (
                      <Play className="media-icon size-[18px] fill-current" />
                    ) : (
                      <Pause className="media-icon size-[18px] fill-current" />
                    )}
                  </IconButton>
                )}
              />
              {qualities.length > 0 ? (
                <QualityControl
                  value={qualityId}
                  qualities={qualities}
                  disabled={!shouldLoad}
                  onValueChange={handleQualityChange}
                />
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
              </TimeSlider.Root>
              <Time.Value type="duration" className="media-time" />
            </div>

            <div className="media-button-group">
              <PlaybackRateControl />

              <VolumeControl />

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

              <IconButton
                onClick={() => setInlineFullscreen(!inlineFullscreen)}
                aria-label={inlineFullscreen ? '退出网页内全屏' : '网页内全屏'}
              >
                {inlineFullscreen ? (
                  <Shrink className="media-icon size-[18px]" />
                ) : (
                  <Expand className="media-icon size-[18px]" />
                )}
              </IconButton>

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
            </div>
          </Controls.Root>
        </Player.Container>
      </Player.Provider>
    </div>
  )
}
