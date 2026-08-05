import type { MediaPlayerClass } from 'dashjs'

import type { FeedPlaybackSource } from '@/lib/weibo/models/feed'

export const AUTO_QUALITY_ID = 'auto'

export interface QualityOption {
  id: string
  label: string
}

export function applyDashQuality(player: MediaPlayerClass, qualityId: string) {
  if (qualityId === AUTO_QUALITY_ID) {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
    return
  }

  const hasTarget = player
    .getRepresentationsByType('video')
    .some((item) => String((item as { id?: string }).id ?? '') === qualityId)

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
    player.setRepresentationForTypeById('video', qualityId, true)
  } catch {
    player.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
  }
}

export function getVariantSource({
  fallbackSrc,
  qualityId,
  selectedIndex,
  sources,
}: {
  fallbackSrc: string
  qualityId: string
  selectedIndex: number
  sources: FeedPlaybackSource['sources']
}) {
  if (sources.length === 0) {
    return fallbackSrc
  }

  if (qualityId !== AUTO_QUALITY_ID) {
    const source = sources.find((item) => item.id === qualityId)
    if (source?.url) {
      return source.url
    }
  }

  return sources[selectedIndex]?.url ?? sources[0]?.url ?? fallbackSrc
}
