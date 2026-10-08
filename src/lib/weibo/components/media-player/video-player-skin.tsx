import { selectPlayback } from '@videojs/core/dom'
import {
  AlertDialog,
  BufferingIndicator,
  Container,
  Controls,
  ErrorDialog,
  FullscreenButton,
  Gesture,
  Hotkey,
  LiveButton,
  PiPButton,
  PlayButton,
  Time,
  TimeSlider,
  Tooltip,
  usePlayer,
} from '@videojs/react'
import {
  Expand,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  PictureInPicture2,
  Play,
  RotateCcw,
  Shrink,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { CenterPlayButton, IconButton, VolumeControl } from './video-player-controls'
import {
  VideoDownloadMenu,
  VideoPlaybackRateMenu,
  VideoQualityMenu,
  type VideoDownloadSettings,
  type VideoQualitySettings,
} from './video-settings-menu'

type VideoPlayerSkinMode = 'video' | 'live' | 'replay'

interface VideoPlayerSkinProps {
  children: ReactNode
  mode?: VideoPlayerSkinMode
  controlsVisible?: boolean
  centerPlayVisible?: boolean
  interactive?: boolean
  quality?: VideoQualitySettings
  download?: VideoDownloadSettings
  inlineFullscreen?: {
    active: boolean
    onToggle: () => void
  }
  onRetry?: () => void
}

interface VideoPlaybackState {
  started: boolean
  paused: boolean
  ended: boolean
}

export function isVideoPlaybackActive(playback: VideoPlaybackState | null | undefined) {
  return playback?.started === true && playback.paused === false && playback.ended === false
}

export function VideoPlayerSkin({
  children,
  mode = 'video',
  controlsVisible = true,
  centerPlayVisible = true,
  interactive = true,
  quality,
  download,
  inlineFullscreen,
  onRetry,
}: VideoPlayerSkinProps) {
  const isLive = mode === 'live'
  const playback = usePlayer(selectPlayback)
  const playbackActive = isVideoPlaybackActive(playback)

  return (
    <Container
      className="media-skin media-container video-skin media-default-skin media-default-skin--video relative h-full w-full overflow-hidden rounded-[inherit]"
      data-theme="default"
      data-preset={isLive ? 'live-video' : 'video'}
    >
      {children}

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
              <AlertDialog.Close className="media-button media-button--primary" onClick={onRetry}>
                重试
              </AlertDialog.Close>
            </div>
          </div>
        </AlertDialog.Popup>
      </ErrorDialog.Root>

      {centerPlayVisible && !playbackActive ? <CenterPlayButton /> : null}

      {controlsVisible && playbackActive ? (
        <Controls.Root>
          <Controls.Backdrop className="video-controls-backdrop" />
          <Tooltip.Provider>
            <Controls.Content
              className={`video-controls video-controls-content${isLive ? ' video-controls-spaced' : ''}`}
            >
              <Controls.Group className="video-controls-primary">
                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <PlayButton
                        className="media-play-button media-button--play"
                        render={(props) => (
                          <IconButton {...props}>
                            <RotateCcw className="media-button-icon media-play-button-restart-icon" />
                            <Play className="media-button-icon media-play-button-play-icon" />
                            <Pause className="media-button-icon media-play-button-pause-icon" />
                          </IconButton>
                        )}
                      />
                    }
                  />
                  <Tooltip.Popup className="media-popup media-popup-surface media-tooltip">
                    播放/暂停
                  </Tooltip.Popup>
                </Tooltip.Root>

                {isLive ? (
                  <LiveButton className="media-button media-button--subtle media-button--live" />
                ) : null}

                <VolumeControl />

                {!isLive ? (
                  <Controls.Group className="video-time-slider-group">
                    <Time.Value type="current" className="media-time-value video-time-value" />
                    <TimeSlider.Root className="media-slider media-time-slider">
                      <TimeSlider.Track className="media-slider-track">
                        <TimeSlider.Fill className="media-slider-fill" />
                        <TimeSlider.Buffer className="media-slider-buffer" />
                      </TimeSlider.Track>
                      <TimeSlider.Thumb className="media-slider-thumb" />
                    </TimeSlider.Root>
                    <Time.Value type="duration" className="media-time-value video-time-value" />
                  </Controls.Group>
                ) : (
                  <div aria-hidden="true" className="video-controls-spacer" />
                )}

                <VideoQualityMenu quality={quality} />
                {!isLive ? <VideoPlaybackRateMenu /> : null}
                <VideoDownloadMenu download={download} />
              </Controls.Group>

              <Controls.Group className="video-controls-secondary">
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
                              <PictureInPicture className="media-button-icon" />
                            ) : (
                              <PictureInPicture2 className="media-button-icon" />
                            )}
                          </IconButton>
                        )}
                      />
                    }
                  />
                  <Tooltip.Popup className="media-popup media-popup-surface media-tooltip">
                    画中画
                  </Tooltip.Popup>
                </Tooltip.Root>

                {inlineFullscreen ? (
                  <Tooltip.Root side="top">
                    <Tooltip.Trigger
                      render={
                        <IconButton
                          onClick={inlineFullscreen.onToggle}
                          aria-label={inlineFullscreen.active ? '退出网页内全屏' : '网页内全屏'}
                        >
                          {inlineFullscreen.active ? (
                            <Shrink className="media-button-icon" />
                          ) : (
                            <Expand className="media-button-icon" />
                          )}
                        </IconButton>
                      }
                    />
                    <Tooltip.Popup className="media-popup media-popup-surface media-tooltip">
                      网页全屏
                    </Tooltip.Popup>
                  </Tooltip.Root>
                ) : null}

                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <FullscreenButton
                        className="media-button--fullscreen"
                        render={(props, state) => (
                          <IconButton
                            {...props}
                            aria-label={state.fullscreen ? '退出全屏' : '全屏'}
                          >
                            {state.fullscreen ? (
                              <Minimize className="media-button-icon" />
                            ) : (
                              <Maximize className="media-button-icon" />
                            )}
                          </IconButton>
                        )}
                      />
                    }
                  />
                  <Tooltip.Popup className="media-popup media-popup-surface media-tooltip">
                    全屏
                  </Tooltip.Popup>
                </Tooltip.Root>
              </Controls.Group>
            </Controls.Content>
          </Tooltip.Provider>
        </Controls.Root>
      ) : null}

      {interactive ? (
        <>
          <Hotkey keys="Space" action="togglePaused" />
          <Hotkey keys="k" action="togglePaused" />
          <Hotkey keys="m" action="toggleMuted" />
          <Hotkey keys="f" action="toggleFullscreen" />
          <Hotkey keys="i" action="togglePictureInPicture" />
          {!isLive ? (
            <>
              <Hotkey keys="c" action="toggleSubtitles" />
              <Hotkey keys="ArrowRight" action="seekStep" value={5} />
              <Hotkey keys="ArrowLeft" action="seekStep" value={-5} />
              <Hotkey keys="l" action="seekStep" value={10} />
              <Hotkey keys="j" action="seekStep" value={-10} />
              <Hotkey keys="0-9" action="seekToPercent" />
              <Hotkey keys="Home" action="seekToPercent" value={0} />
              <Hotkey keys="End" action="seekToPercent" value={100} />
              <Hotkey keys=">" action="speedUp" />
              <Hotkey keys="<" action="speedDown" />
            </>
          ) : null}
          <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
          <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />

          <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
          <Gesture type="tap" action="toggleControls" pointer="touch" />
          {!isLive ? (
            <>
              <Gesture type="doubletap" action="seekStep" value={-10} region="left" />
              <Gesture type="doubletap" action="seekStep" value={10} region="right" />
            </>
          ) : null}
          <Gesture type="doubletap" action="toggleFullscreen" region="center" />
        </>
      ) : null}
    </Container>
  )
}
