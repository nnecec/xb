'use client'

import {
  createPlayer,
  Controls,
  FullscreenButton,
  MuteButton,
  PiPButton,
  PlayButton,
  Popover,
  Time,
  TimeSlider,
  VolumeSlider,
} from '@videojs/react'
import { Video, videoFeatures } from '@videojs/react/video'
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
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'
import type { FeedDashSource } from '@/lib/weibo/models/feed'

import '@videojs/react/video/skin.css'

const Player = createPlayer({ features: [...videoFeatures] })

interface LivePlayerProps {
  streamUrl: string
  coverUrl: string
  liveStatus: number
  replayUrl?: string
  dash?: FeedDashSource
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

function LiveOverlay({ isPlaying, onPlay }: { isPlaying: boolean; onPlay: () => void }) {
  if (isPlaying) {
    return null
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <button type="button" className="group flex items-center justify-center" onClick={onPlay}>
        <div className="flex size-14 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
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
    if (videoRef.current) {
      videoRef.current.src = streamUrl
      videoRef.current.play().catch(() => {})
    }
  }, [streamUrl])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [])

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

  if (!isLive && !isReplay) {
    return (
      <div className="relative h-full w-full">
        <Player.Provider>
          <Player.Container className="media-default-skin media-default-skin--video relative h-full w-full overflow-hidden rounded-[inherit]">
            <Video src={undefined} poster={coverUrl} preload="none" playsInline />
          </Player.Container>
        </Player.Provider>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <Player.Provider>
        <Player.Container className="media-default-skin media-default-skin--video relative h-full w-full overflow-hidden rounded-[inherit]">
          <Video
            ref={videoRef}
            src={isReplay ? replayUrl : streamUrl}
            poster={coverUrl}
            preload="metadata"
            playsInline
            onPointerDownCapture={isReplay ? undefined : handlePointerDown}
            onLoadedMetadata={handleLoadedMetadata}
          />
          {isLive && !shouldLoad && <LiveOverlay isPlaying={false} onPlay={handlePlay} />}
          {shouldLoad && (
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
              </div>

              <div className="media-time-controls">
                <span className="media-time">LIVE</span>
              </div>

              <div className="media-button-group">
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
          )}
          {isReplay && (
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
          )}
        </Player.Container>
      </Player.Provider>
    </div>
  )
}
