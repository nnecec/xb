import { selectPlayback } from '@videojs/core/dom'
import { MuteButton, Popover, usePlayer, VolumeSlider } from '@videojs/react'
import { cn } from 'cn'
import { Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

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

export const IconButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { className?: string }
>(function IconButton({ className, ...props }, ref) {
  return <PlayerButton ref={ref} className={cn('media-button--icon', className)} {...props} />
})

export function VolumeControl() {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported')
  const muteButton = (
    <MuteButton
      className="media-mute-button video-controls-volume-button"
      render={(props) => (
        <IconButton {...props}>
          <VolumeX className="media-button-icon media-mute-button-off-icon" />
          <Volume1 className="media-button-icon media-mute-button-low-icon" />
          <Volume2 className="media-button-icon media-mute-button-high-icon" />
        </IconButton>
      )}
    />
  )

  if (volumeUnsupported) return muteButton

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-volume-popover">
        <VolumeSlider.Root
          className="media-slider media-volume-slider"
          orientation="vertical"
          thumbAlignment="edge"
        >
          <VolumeSlider.Track className="media-slider-track">
            <VolumeSlider.Fill className="media-slider-fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider-thumb media-volume-slider-thumb" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  )
}

export function CenterPlayButton() {
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
