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
} from '@videojs/react'
import {
  Download,
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
import { VideoSettingsMenu, type VideoQualitySettings } from './video-settings-menu'

type VideoPlayerSkinMode = 'video' | 'live' | 'replay'

interface VideoPlayerSkinProps {
  children: ReactNode
  mode?: VideoPlayerSkinMode
  controlsVisible?: boolean
  centerPlayVisible?: boolean
  interactive?: boolean
  quality?: VideoQualitySettings
  download?: {
    loading: boolean
    onSelect: () => void
  }
  inlineFullscreen?: {
    active: boolean
    onToggle: () => void
  }
  onRetry?: () => void
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

  return (
    <Container className="media-default-skin media-default-skin--video relative h-full w-full overflow-hidden rounded-[inherit]">
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

      {centerPlayVisible ? <CenterPlayButton /> : null}

      {controlsVisible ? (
        <Controls.Root className="media-surface media-controls media-controls--root">
          <Tooltip.Provider>
            <div className="media-surface media-controls media-controls--primary">
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

                <VolumeControl />

                {isLive ? (
                  <LiveButton className="media-button media-button--subtle media-button--live" />
                ) : null}
              </div>

              {!isLive ? (
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
              ) : null}

              <div className="media-button-group">
                {download ? (
                  <Tooltip.Root side="top">
                    <Tooltip.Trigger
                      render={
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation()
                            download.onSelect()
                          }}
                          aria-label="下载视频"
                          disabled={download.loading}
                        >
                          <Download className="media-icon size-[18px]" />
                        </IconButton>
                      }
                    />
                    <Tooltip.Popup className="media-surface media-tooltip">
                      {download.loading ? '下载中…' : '下载视频'}
                    </Tooltip.Popup>
                  </Tooltip.Root>
                ) : null}

                <VideoSettingsMenu quality={quality} allowPlaybackRate={!isLive} />
              </div>
            </div>

            <div className="media-surface media-controls media-controls--secondary">
              <div className="media-button-group">
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

                {inlineFullscreen ? (
                  <Tooltip.Root side="top">
                    <Tooltip.Trigger
                      render={
                        <IconButton
                          onClick={inlineFullscreen.onToggle}
                          aria-label={inlineFullscreen.active ? '退出网页内全屏' : '网页内全屏'}
                        >
                          {inlineFullscreen.active ? (
                            <Shrink className="media-icon size-[18px]" />
                          ) : (
                            <Expand className="media-icon size-[18px]" />
                          )}
                        </IconButton>
                      }
                    />
                    <Tooltip.Popup className="media-surface media-tooltip">网页全屏</Tooltip.Popup>
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
            </div>
          </Tooltip.Provider>
        </Controls.Root>
      ) : null}

      <div className="media-overlay" />

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
