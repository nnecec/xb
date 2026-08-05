import type { ContentDisplay } from '@/lib/app-settings'
import type { FeedImage, FeedItem, FeedMixMediaItem } from '@/lib/weibo/models/feed'

export type MediaGalleryItem =
  | {
      kind: 'image'
      id: string
      image: FeedImage
    }
  | {
      kind: 'video'
      id: string
      video: FeedMixMediaItem
    }

export type MediaGroup =
  | {
      kind: 'standalone'
      key: string
      display: ContentDisplay
      summary: string
      maxWidth?: number
    }
  | {
      kind: 'gallery'
      key: string
      display: ContentDisplay
      summary: string
      items: MediaGalleryItem[]
      singleMediaMaxWidth?: number
    }

function itemLabel(count: number, label: string) {
  return `此微博包含 ${count} ${label}`
}

function combinedSummary(imageCount: number, videoCount: number) {
  if (imageCount > 0 && videoCount === 0) return itemLabel(imageCount, '张图片')
  if (videoCount > 0 && imageCount === 0) return itemLabel(videoCount, '个视频')
  return itemLabel(imageCount + videoCount, '项媒体')
}

export function buildMediaGalleryItems(
  images: FeedImage[],
  mixMediaItems: FeedMixMediaItem[] = [],
): MediaGalleryItem[] {
  const items: MediaGalleryItem[] = images.map((image) => ({
    kind: 'image',
    id: image.id,
    image,
  }))

  for (const item of mixMediaItems) {
    if (item.type === 'pic' && item.image) {
      items.push({ kind: 'image', id: item.id, image: item.image })
    } else if (item.type === 'video') {
      items.push({ kind: 'video', id: item.id, video: item })
    }
  }

  return items
}

export function mediaGroupKey(items: MediaGalleryItem[]) {
  return items.map((item) => `${item.kind}:${item.id}`).join('|')
}

export function buildMediaGroups(
  item: FeedItem | NonNullable<FeedItem['retweetedStatus']>,
  options: {
    imageDisplay: ContentDisplay
    videoDisplay: ContentDisplay
    audioDisplay: ContentDisplay
    singleImageMaxWidth: number
    singleVideoMaxWidth: number
  },
): MediaGroup[] {
  const mixPictures = item.mixMediaInfo?.filter((media) => media.type === 'pic') ?? []
  const mixVideos = item.mixMediaInfo?.filter((media) => media.type === 'video') ?? []
  const imageItems = buildMediaGalleryItems(item.images, mixPictures)
  const videoItems = buildMediaGalleryItems([], mixVideos)
  const combinedItems = buildMediaGalleryItems(item.images, item.mixMediaInfo)
  const imageCount = imageItems.length
  const videoCount = videoItems.length
  const combinedCount = imageCount + videoCount
  const totalMediaCount = combinedCount + (item.media ? 1 : 0)
  const groups: MediaGroup[] = []

  if (item.media) {
    const standaloneDisplay =
      item.media.type === 'audio' || item.media.type === 'podcast_audio'
        ? options.audioDisplay
        : options.videoDisplay
    groups.push({
      kind: 'standalone',
      key: `${item.id}:standalone:${item.media.type}`,
      display: standaloneDisplay,
      summary:
        item.media.type === 'audio' || item.media.type === 'podcast_audio'
          ? '此微博包含音频或播客'
          : item.media.type === 'live'
            ? '此微博包含直播或回放'
            : '此微博包含视频',
      maxWidth:
        item.media.type === 'video' && combinedCount === 0
          ? options.singleVideoMaxWidth
          : undefined,
    })
  }

  if (combinedCount > 0 && options.imageDisplay === options.videoDisplay) {
    groups.push({
      kind: 'gallery',
      key: `${item.id}:gallery:${mediaGroupKey(combinedItems)}`,
      display: options.imageDisplay,
      summary: combinedSummary(imageCount, videoCount),
      items: combinedItems,
      singleMediaMaxWidth:
        totalMediaCount === 1
          ? imageCount === 1
            ? options.singleImageMaxWidth
            : options.singleVideoMaxWidth
          : undefined,
    })
  }

  if (options.imageDisplay !== options.videoDisplay) {
    if (imageCount > 0) {
      groups.push({
        kind: 'gallery',
        key: `${item.id}:images:${mediaGroupKey(imageItems)}`,
        display: options.imageDisplay,
        summary: itemLabel(imageCount, '张图片'),
        items: imageItems,
      })
    }
    if (videoCount > 0) {
      groups.push({
        kind: 'gallery',
        key: `${item.id}:videos:${mediaGroupKey(videoItems)}`,
        display: options.videoDisplay,
        summary: itemLabel(videoCount, '个视频'),
        items: videoItems,
      })
    }
  }

  return groups
}
