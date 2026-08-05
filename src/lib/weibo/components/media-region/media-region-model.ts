import type { FeedImage, FeedItem, FeedMedia, FeedMixMediaItem } from '@/lib/weibo/models/feed'

export type MediaAsset =
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
  | {
      kind: 'standalone'
      id: string
      media: FeedMedia
    }

export type MediaGalleryItem = Extract<MediaAsset, { kind: 'image' | 'video' }>

export interface MediaRegionModel {
  key: string
  summary: string
  assets: MediaAsset[]
  singleMediaMaxWidth?: number
}

function itemLabel(count: number, label: string) {
  return `此微博包含 ${count} ${label}`
}

function mediaSummary(assets: MediaAsset[]) {
  const counts = new Map<string, number>()
  for (const asset of assets) {
    const label =
      asset.kind === 'image'
        ? '张图片'
        : asset.kind === 'video'
          ? '个视频'
          : asset.media.type === 'live'
            ? '个直播或回放'
            : '个音频'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  if (counts.size === 1) {
    const [label, count] = counts.entries().next().value as [string, number]
    return itemLabel(count, label)
  }
  return itemLabel(assets.length, '项媒体')
}

export function buildMediaGalleryItems(
  images: FeedImage[],
  mixMediaItems: FeedMixMediaItem[] = [],
): MediaGalleryItem[] {
  if (mixMediaItems.length === 0) {
    return images.map((image) => ({ kind: 'image', id: image.id, image }))
  }

  const items: MediaGalleryItem[] = []
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

function mediaAssetKey(asset: MediaAsset) {
  return `${asset.kind}:${asset.id}`
}

export function buildMediaAssets(
  item: FeedItem | NonNullable<FeedItem['retweetedStatus']>,
): MediaAsset[] {
  const source: MediaAsset[] =
    item.mixMediaInfo && item.mixMediaInfo.length > 0
      ? item.mixMediaInfo.flatMap((media): MediaAsset[] => {
          if (media.type === 'pic' && media.image) {
            return [{ kind: 'image', id: media.id, image: media.image }]
          }
          if (
            media.type === 'video' &&
            (media.videoCoverUrl || media.videoStreamUrl || media.videoDash)
          ) {
            return [
              {
                kind: 'video',
                id: media.id,
                video: media,
                playable: Boolean(media.videoStreamUrl || media.videoDash),
              },
            ]
          }
          return []
        })
      : [
          ...(item.media
            ? [{ kind: 'standalone' as const, id: `${item.id}:media`, media: item.media }]
            : []),
          ...item.images.map((image) => ({ kind: 'image' as const, id: image.id, image })),
        ]

  const seen = new Set<string>()
  return source.filter((asset) => {
    const key = mediaAssetKey(asset)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildMediaRegionModel(
  item: FeedItem | NonNullable<FeedItem['retweetedStatus']>,
  options: { singleImageMaxWidth: number; singleVideoMaxWidth: number },
): MediaRegionModel | null {
  const assets = buildMediaAssets(item)
  if (assets.length === 0) return null
  const singleAsset = assets.length === 1 ? assets[0] : undefined
  return {
    key: `${item.id}:${assets.map(mediaAssetKey).join('|')}`,
    summary: mediaSummary(assets),
    assets,
    singleMediaMaxWidth:
      singleAsset?.kind === 'image'
        ? options.singleImageMaxWidth
        : singleAsset?.kind === 'video'
          ? options.singleVideoMaxWidth
          : singleAsset?.kind === 'standalone' && singleAsset.media.type === 'video'
            ? options.singleVideoMaxWidth
            : undefined,
  }
}
