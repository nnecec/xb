import type { ContentDisplay } from '@/lib/app-settings'
import { CollapsibleMedia } from '@/lib/weibo/components/collapsible-media'
import type { FeedItem } from '@/lib/weibo/models/feed'

import { FeedMediaBlock } from '../feed-card/feed-card-media'
import { MediaRegion } from './media-region'
import { buildMediaGroups } from './media-region-model'

export function MediaRegionList({
  item,
  imageDisplay,
  videoDisplay,
  audioDisplay,
  singleImageMaxWidth,
  singleVideoMaxWidth,
  downloadFilename,
  onOpen,
}: {
  item: FeedItem | NonNullable<FeedItem['retweetedStatus']>
  imageDisplay: ContentDisplay
  videoDisplay: ContentDisplay
  audioDisplay: ContentDisplay
  singleImageMaxWidth: number
  singleVideoMaxWidth: number
  downloadFilename: string
  onOpen?: () => void
}) {
  const groups = buildMediaGroups(item, {
    imageDisplay,
    videoDisplay,
    audioDisplay,
    singleImageMaxWidth,
    singleVideoMaxWidth,
  })

  return groups.map((group) => (
    <CollapsibleMedia key={group.key} display={group.display} summary={group.summary}>
      {group.kind === 'standalone' ? (
        <FeedMediaBlock item={item} maxWidth={group.maxWidth} />
      ) : (
        <MediaRegion
          items={group.items}
          downloadFilename={downloadFilename}
          onOpen={onOpen}
          singleMediaMaxWidth={group.singleMediaMaxWidth}
        />
      )}
    </CollapsibleMedia>
  ))
}
