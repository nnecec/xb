import type { ContentDisplay } from '@/lib/app-settings'
import { MediaRegionList } from '@/lib/weibo/components/media-region/media-region-list'
import type { FeedItem } from '@/lib/weibo/models/feed'

export function FeedCardMediaContent({
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
  return (
    <MediaRegionList
      item={item}
      imageDisplay={imageDisplay}
      videoDisplay={videoDisplay}
      audioDisplay={audioDisplay}
      singleImageMaxWidth={singleImageMaxWidth}
      singleVideoMaxWidth={singleVideoMaxWidth}
      downloadFilename={downloadFilename}
      onOpen={onOpen}
    />
  )
}
