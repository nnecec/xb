import { selectPlaybackRate, selectPlayback } from '@videojs/core/dom'
import { MuteButton, Popover, usePlayer, VolumeSlider } from '@videojs/react'
import { Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { AUTO_QUALITY_ID, formatPlaybackRate, type QualityOption } from './video-player-dash'

export const PlayerButton = forwardRef<
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

interface QualityControlProps {
  value: string
  qualities: QualityOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
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

export function QualityControl({
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
                  'rounded-lg px-3 py-1.5 text-left text-xs transition-colors',
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

export function PlaybackRateControl() {
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
                  'rounded-lg px-3 py-1.5 text-left text-xs transition-colors',
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
