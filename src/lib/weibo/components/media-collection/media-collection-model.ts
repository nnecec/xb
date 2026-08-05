import type { FeedImage, FeedMixMediaItem } from '@/lib/weibo/models/feed'

export type MediaCollectionItem =
  | {
      kind: 'image'
      id: string
      image: FeedImage
    }
  | {
      kind: 'video'
      id: string
      video: FeedMixMediaItem
      playable: boolean
    }

export function buildMediaCollectionItems(
  images: FeedImage[],
  mixMediaItems: FeedMixMediaItem[] = [],
): MediaCollectionItem[] {
  if (mixMediaItems.length === 0) {
    return images.map((image) => ({ kind: 'image', id: image.id, image }))
  }

  const items: MediaCollectionItem[] = []
  for (const item of mixMediaItems) {
    if (item.type === 'pic' && item.image) {
      items.push({ kind: 'image', id: item.id, image: item.image })
    } else if (
      item.type === 'video' &&
      (item.videoCoverUrl || item.videoStreamUrl || item.videoDash)
    ) {
      items.push({
        kind: 'video',
        id: item.id,
        video: item,
        playable: Boolean(item.videoStreamUrl || item.videoDash),
      })
    }
  }
  return items
}
