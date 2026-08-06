import { Menu, usePlaybackRateOptions, useQualityOptions } from '@videojs/react'
import type { PlaybackRateOptionsResult } from '@videojs/react'
import { Check, ChevronLeft, ChevronRight, Gauge, Settings } from 'lucide-react'

import { AUTO_QUALITY_ID, type QualityOption } from './video-playback-quality'
import { IconButton } from './video-player-controls'

export interface VideoQualitySettings {
  value: string
  options: QualityOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

interface VideoSettingsMenuProps {
  quality?: VideoQualitySettings
  allowPlaybackRate?: boolean
}

function MenuChevron({ back = false }: { back?: boolean }) {
  const Icon = back ? ChevronLeft : ChevronRight
  return <Icon className="media-icon media-menu__chevron" />
}

export function VideoSettingsMenu({ quality, allowPlaybackRate = true }: VideoSettingsMenuProps) {
  if (!allowPlaybackRate) {
    return <VideoSettingsMenuContent quality={quality} playbackRate={null} />
  }

  return <VideoSettingsMenuWithPlaybackRate quality={quality} />
}

function VideoSettingsMenuWithPlaybackRate({ quality }: Pick<VideoSettingsMenuProps, 'quality'>) {
  const playbackRate = usePlaybackRateOptions()
  const adaptiveQuality = useQualityOptions()
  const resolvedQuality =
    quality ??
    (adaptiveQuality?.state.availability === 'available'
      ? {
          value: adaptiveQuality.value,
          options: adaptiveQuality.options
            .filter((option) => option.value !== AUTO_QUALITY_ID)
            .map((option) => ({ id: option.value, label: option.label })),
          onValueChange: adaptiveQuality.setValue,
        }
      : undefined)
  return <VideoSettingsMenuContent quality={resolvedQuality} playbackRate={playbackRate} />
}

function VideoSettingsMenuContent({
  quality,
  playbackRate,
}: {
  quality?: VideoQualitySettings
  playbackRate: PlaybackRateOptionsResult | null
}) {
  const hasQuality = Boolean(quality?.options.length)
  const hasPlaybackRate = playbackRate?.state.availability === 'available'

  if (!hasQuality && !hasPlaybackRate) {
    return null
  }

  const qualityOptions = quality ? [{ id: AUTO_QUALITY_ID, label: '自动' }, ...quality.options] : []
  const currentQualityLabel =
    qualityOptions.find((option) => option.id === quality?.value)?.label ?? '自动'

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        aria-label="播放设置"
        className="media-button--settings"
        render={<IconButton />}
      >
        <Settings className="media-icon media-icon--settings size-[18px]" />
      </Menu.Trigger>

      <Menu.Content className="media-surface media-popover media-menu media-menu--settings">
        <Menu.View className="media-menu__panel">
          <div className="media-menu__group">
            {hasQuality && quality ? (
              <Menu.Root>
                <Menu.Trigger
                  type="quality"
                  className="media-menu__item media-menu__item--submenu"
                  disabled={quality.disabled}
                  render={(props) => (
                    <div {...props}>
                      <Gauge className="media-icon" />
                      <span>清晰度</span>
                      <span className="media-menu__hint">
                        <span className="media-menu__hint-label">{currentQualityLabel}</span>
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron back />
                    清晰度
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={quality.value}
                    onValueChange={quality.onValueChange}
                    aria-label="清晰度"
                  >
                    {qualityOptions.map((option) => (
                      <Menu.RadioItem
                        key={option.id}
                        className="media-menu__item"
                        value={option.id}
                        disabled={quality.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.id === quality.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <Check className="media-icon" />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}

            {hasPlaybackRate && playbackRate ? (
              <Menu.Root>
                <Menu.Trigger
                  type="playback-rate"
                  className="media-menu__item media-menu__item--submenu"
                  render={(props) => (
                    <div {...props}>
                      <Gauge className="media-icon" />
                      <span>播放速度</span>
                      <span className="media-menu__hint">
                        <Menu.ItemValue className="media-menu__hint-label" />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron back />
                    播放速度
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={playbackRate.value}
                    onValueChange={playbackRate.setValue}
                    aria-label="播放速度"
                  >
                    {playbackRate.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className="media-menu__item"
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === playbackRate.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <Check className="media-icon" />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}
          </div>
        </Menu.View>
      </Menu.Content>
    </Menu.Root>
  )
}
