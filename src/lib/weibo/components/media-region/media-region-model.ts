import type { WeiboCardMediaCollapseType } from '@/lib/app-settings'
import type { FeedItem, FeedMedia } from '@/lib/weibo/models/feed'

import {
  buildMediaCollectionItems,
  type MediaCollectionItem,
} from '../media-collection/media-collection-model'

export type MediaAsset =
  | MediaCollectionItem
  | {
      kind: 'standalone'
      id: string
      media: FeedMedia
    }

export interface MediaRegionModel {
  key: string
  summary: string
  assets: MediaAsset[]
  singleMediaMaxWidth?: number
}

export function getMediaRegionCollapseType(
  region: Pick<MediaRegionModel, 'assets'>,
): WeiboCardMediaCollapseType | null {
  if (region.assets.length > 1) return 'multiple'

  const [asset] = region.assets
  if (!asset) return null
  if (asset.kind === 'image') return 'image'
  if (asset.kind === 'video') return 'video'
  if (asset.media.type === 'video') return 'video'
  if (asset.media.type === 'live') return 'live'
  if (
    (asset.media.type === 'audio' || asset.media.type === 'podcast_audio') &&
    (asset.media.sourceObjectType === 'audio' || asset.media.sourceObjectType === 'podcast_audio')
  ) {
    return 'audio'
  }

  return null
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

function mediaAssetKey(asset: MediaAsset) {
  return `${asset.kind}:${asset.id}`
}

export function buildMediaAssets(
  item: FeedItem | NonNullable<FeedItem['retweetedStatus']>,
): MediaAsset[] {
  const source: MediaAsset[] =
    item.mixMediaInfo && item.mixMediaInfo.length > 0
      ? buildMediaCollectionItems([], item.mixMediaInfo)
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
