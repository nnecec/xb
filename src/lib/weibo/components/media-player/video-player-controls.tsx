import { selectPlayback } from '@videojs/core/dom'
import { MuteButton, Popover, usePlayer, VolumeSlider } from '@videojs/react'
import { Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

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
