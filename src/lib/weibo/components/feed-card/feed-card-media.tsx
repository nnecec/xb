import { useCallback } from 'react'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import type { FeedItem } from '@/lib/weibo/models/feed'

import { AudioPlayerComponent } from '../media-player/audio-player'
import { LivePlayer } from '../media-player/live-player'
import { VideoPlayer } from '../media-player/video-player'
import { getMediaDownloadFilename } from './feed-card-utils'

export function FeedMediaBlock({ item, maxWidth }: { item: FeedItem; maxWidth?: number }) {
  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(item)
  }, [item])

  if (!item.media) {
    return null
  }

  if (item.media.type === 'audio') {
    return (
      <div
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <AudioPlayerComponent src={item.media.streamUrl} />
      </div>
    )
  }

  if (item.media.type === 'live') {
    return (
      <div
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <AspectRatio
          ratio={16 / 9}
          className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        >
          <LivePlayer
            streamUrl={item.media.streamUrl}
            coverUrl={item.media.coverUrl ?? ''}
            liveStatus={item.media.liveStatus ?? 0}
            replayUrl={item.media.replayUrl}
          />
        </AspectRatio>
      </div>
    )
  }

  return (
    <div
      onClick={(event) => {
        event.stopPropagation()
      }}
      className="w-full"
      style={maxWidth !== undefined ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      <AspectRatio
        ratio={item.media.videoOrientation === 'vertical' ? 4 / 3 : 16 / 9}
        className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
      >
        <VideoPlayer
          progressiveSrc={item.media.streamUrl}
          poster={item.media.coverUrl ?? undefined}
          dash={item.media.dash}
          downloadUrl={item.media.downloadUrl}
          downloadFilename={getMediaDownloadFilename(item)}
          onPlay={addEntry}
        />
      </AspectRatio>
    </div>
  )
}
