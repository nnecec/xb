import type { MediaPlayerClass } from 'dashjs'
import type { RefObject } from 'react'

import type { FeedPlaybackSource } from '@/lib/weibo/models/feed'

export const AUTO_QUALITY_ID = 'auto'

export interface QualityOption {
  id: string
  label: string
}

export interface PlaybackResumeState {
  currentTime: number
  playbackRate: number
  shouldResume: boolean
}

export function formatPlaybackRate(rate: number) {
  return `${rate}x`
}

export function applyVideoQuality(player: MediaPlayerClass, mode: string) {
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

export function destroyDashPlayer(
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

export function getPlaybackSrc({
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
