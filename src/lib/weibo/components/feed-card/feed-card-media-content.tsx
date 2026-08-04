import type { ContentDisplay } from '@/lib/app-settings'
import { CollapsibleMedia } from '@/lib/weibo/components/collapsible-media'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import type { FeedItem } from '@/lib/weibo/models/feed'

import { FeedMediaBlock } from './feed-card-media'

function itemLabel(count: number, label: string) {
  return `此微博包含 ${count} ${label}`
}

function combinedSummary(imageCount: number, videoCount: number) {
  if (imageCount > 0 && videoCount === 0) return itemLabel(imageCount, '张图片')
  if (videoCount > 0 && imageCount === 0) return itemLabel(videoCount, '个视频')
  return itemLabel(imageCount + videoCount, '项媒体')
}

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
  const mixPictures = item.mixMediaInfo?.filter((media) => media.type === 'pic') ?? []
  const mixVideos = item.mixMediaInfo?.filter((media) => media.type === 'video') ?? []
  const imageCount = item.images.length + mixPictures.length
  const videoCount = mixVideos.length
  const combinedCount = imageCount + videoCount
  const totalMediaCount = combinedCount + (item.media ? 1 : 0)
  const singleMediaMaxWidth =
    totalMediaCount === 1
      ? imageCount === 1
        ? singleImageMaxWidth
        : singleVideoMaxWidth
      : undefined
  const standaloneVideoMaxWidth =
    item.media?.type === 'video' && combinedCount === 0 ? singleVideoMaxWidth : undefined
  const standaloneDisplay =
    item.media?.type === 'audio' || item.media?.type === 'podcast_audio'
      ? audioDisplay
      : videoDisplay

  return (
    <>
      {item.media ? (
        <CollapsibleMedia
          display={standaloneDisplay}
          summary={
            item.media.type === 'audio' || item.media.type === 'podcast_audio'
              ? '此微博包含音频或播客'
              : item.media.type === 'live'
                ? '此微博包含直播或回放'
                : '此微博包含视频'
          }
        >
          <FeedMediaBlock item={item} maxWidth={standaloneVideoMaxWidth} />
        </CollapsibleMedia>
      ) : null}

      {combinedCount > 0 && imageDisplay === videoDisplay ? (
        <CollapsibleMedia display={imageDisplay} summary={combinedSummary(imageCount, videoCount)}>
          <ImageCarousel
            images={item.images}
            mixMediaItems={item.mixMediaInfo}
            downloadFilename={downloadFilename}
            onOpen={onOpen}
            singleMediaMaxWidth={singleMediaMaxWidth}
            variant="card"
          />
        </CollapsibleMedia>
      ) : null}

      {imageDisplay !== videoDisplay && imageCount > 0 ? (
        <CollapsibleMedia display={imageDisplay} summary={itemLabel(imageCount, '张图片')}>
          <ImageCarousel
            images={item.images}
            mixMediaItems={mixPictures}
            downloadFilename={downloadFilename}
            onOpen={onOpen}
            singleMediaMaxWidth={singleMediaMaxWidth}
            variant="card"
          />
        </CollapsibleMedia>
      ) : null}

      {imageDisplay !== videoDisplay && videoCount > 0 ? (
        <CollapsibleMedia display={videoDisplay} summary={itemLabel(videoCount, '个视频')}>
          <ImageCarousel
            images={[]}
            mixMediaItems={mixVideos}
            downloadFilename={downloadFilename}
            onOpen={onOpen}
            singleMediaMaxWidth={singleMediaMaxWidth}
            variant="card"
          />
        </CollapsibleMedia>
      ) : null}
    </>
  )
}
