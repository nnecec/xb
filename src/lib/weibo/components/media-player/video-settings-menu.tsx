import { Menu, usePlaybackRateOptions, useQualityOptions } from '@videojs/react'
import type { PlaybackRateOptionsResult } from '@videojs/react'
import { Check, Download } from 'lucide-react'

import type { QualityOption } from './video-playback-quality'
import { IconButton } from './video-player-controls'

export interface VideoQualitySettings {
  value: string
  options: QualityOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

export interface VideoDownloadSettings {
  options: Array<{ id: string; label: string; loading?: boolean }>
  onSelect: (id: string) => void
}

export function VideoQualityMenu({ quality }: { quality?: VideoQualitySettings }) {
  return quality ? <VideoQualityMenuContent quality={quality} /> : <AdaptiveVideoQualityMenu />
}

function AdaptiveVideoQualityMenu() {
  const adaptiveQuality = useQualityOptions()
  if (adaptiveQuality?.state.availability !== 'available') return null

  return (
    <VideoQualityMenuContent
      quality={{
        value: adaptiveQuality.value,
        options: adaptiveQuality.options.map((option) => ({
          id: option.value,
          label: option.label,
          preferenceKey: option.value,
        })),
        onValueChange: adaptiveQuality.setValue,
      }}
    />
  )
}

function VideoQualityMenuContent({ quality }: { quality: VideoQualitySettings }) {
  if (quality.options.length === 0) return null

  const currentLabel =
    quality.options.find((option) => option.id === quality.value)?.label ?? '最高'

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        aria-label={`清晰度：${currentLabel}`}
        className="media-button media-button--subtle media-button--quality"
        disabled={quality.disabled}
      >
        {currentLabel}
      </Menu.Trigger>
      <Menu.Content
        className="media-surface media-popover media-menu media-menu--quality"
        aria-label="清晰度"
      >
        <Menu.RadioGroup
          className="media-menu__group"
          value={quality.value}
          onValueChange={quality.onValueChange}
          aria-label="清晰度"
        >
          {quality.options.map((option) => (
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
  )
}

export function VideoPlaybackRateMenu() {
  const playbackRate = usePlaybackRateOptions()
  if (playbackRate?.state.availability !== 'available') return null

  return <VideoPlaybackRateMenuContent playbackRate={playbackRate} />
}

type VideoPlaybackRateSettings = Pick<PlaybackRateOptionsResult, 'options' | 'setValue' | 'value'>

export function VideoPlaybackRateMenuContent({
  playbackRate,
}: {
  playbackRate: VideoPlaybackRateSettings
}) {
  const currentLabel =
    playbackRate.options.find((option) => option.value === playbackRate.value)?.label ??
    playbackRate.value

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        aria-label={`播放速度：${currentLabel}`}
        className="media-button media-button--subtle media-button--playback-rate-trigger"
      >
        {currentLabel}
      </Menu.Trigger>
      <Menu.Content
        className="media-surface media-popover media-menu media-menu--playback-rate"
        aria-label="播放速度"
      >
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
  )
}

export function VideoDownloadMenu({ download }: { download?: VideoDownloadSettings }) {
  if (!download?.options.length) return null

  const downloading = download.options.some((option) => option.loading)

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        aria-label={downloading ? '下载视频，下载中' : '下载视频'}
        render={<IconButton className="media-button--download" />}
      >
        <Download className="media-icon size-[18px]" />
      </Menu.Trigger>
      <Menu.Content
        className="media-surface media-popover media-menu media-menu--download"
        aria-label="下载视频"
      >
        <div className="media-menu__group">
          {download.options.map((option) => (
            <Menu.Item
              key={option.id}
              className="media-menu__item"
              disabled={option.loading}
              onClick={() => download.onSelect(option.id)}
            >
              <span>{option.loading ? `${option.label}，下载中…` : option.label}</span>
            </Menu.Item>
          ))}
        </div>
      </Menu.Content>
    </Menu.Root>
  )
}
