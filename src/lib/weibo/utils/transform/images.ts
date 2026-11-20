/**
 * Image transformation utilities for Weibo data.
 */

import type { FeedImage } from '@/lib/weibo/models/feed'
import type { WeiboPicInfo, WeiboStatus } from '@/lib/weibo/models/weibo-api'

import { pickNonEmptyUrl, stripUrlQuery, uniqueNonEmptyUrls } from './helpers'

function pickLivePhotoVideoUrl(info: WeiboPicInfo | undefined): string | undefined {
  if (!info) return undefined
  const candidates: Array<string | undefined> = [
    typeof info.video === 'string' ? info.video : info.video?.url,
    typeof info.video_hd === 'string' ? info.video_hd : info.video_hd?.url,
    typeof info.livephoto_video === 'string' ? info.livephoto_video : info.livephoto_video?.url,
  ]
  for (const candidate of candidates) {
    const url = pickNonEmptyUrl(candidate)
    if (url) return url
  }
  return undefined
}

interface WeiboUrlStruct {
  url_type?: number | string
  short_url?: string
  url_title?: string
  long_url?: string
  ori_url?: string
  h5_target_url?: string
  pic_ids?: string[]
  pic_infos?: Record<string, WeiboPicInfo>
}

/**
 * Gets download URLs from pic info.
 */
function imageDownloadUrlsFromInfo(info: WeiboPicInfo | undefined): string[] {
  if (!info) return []

  return uniqueNonEmptyUrls([
    stripUrlQuery(info.woriginal?.url),
    stripUrlQuery(info.original?.url),
    stripUrlQuery(info.mw2000?.url),
    stripUrlQuery(info.largest?.url),
    stripUrlQuery(info.large?.url),
    stripUrlQuery(info.bmiddle?.url),
    stripUrlQuery(info.thumbnail?.url),
  ])
}

/**
 * Converts pic_ids and pic_infos to FeedImage array.
 */
export function toImagesFromParts(
  picIds?: string[],
  picInfos?: Record<string, WeiboPicInfo>,
): FeedImage[] {
  if (!Array.isArray(picIds) || !picInfos) {
    return []
  }

  const images: FeedImage[] = []

  for (const picId of picIds) {
    const info = picInfos?.[picId]
    const thumbnailUrl = info?.large?.url ?? info?.bmiddle?.url ?? info?.thumbnail?.url
    const largeImage =
      info?.largest ??
      info?.mw2000 ??
      info?.woriginal ??
      info?.original ??
      info?.large ??
      info?.bmiddle ??
      info?.thumbnail
    const largeUrl = largeImage?.url
    if (!thumbnailUrl || !largeUrl) {
      continue
    }

    const downloadUrls = imageDownloadUrlsFromInfo(info)
    const livePhotoVideoUrl = pickLivePhotoVideoUrl(info)
    images.push({
      id: picId,
      thumbnailUrl,
      largeUrl,
      ...(downloadUrls.length > 0 ? { downloadUrls } : {}),
      ...(typeof largeImage?.width === 'number' ? { width: largeImage.width } : {}),
      ...(typeof largeImage?.height === 'number' ? { height: largeImage.height } : {}),
      ...(info?.type === 'livephoto' ? { type: 'livephoto' as const } : {}),
      ...(livePhotoVideoUrl ? { livePhotoVideoUrl } : {}),
    })
  }

  return images
}

/**
 * Converts status to images array.
 */
export function toImages(status: WeiboStatus): FeedImage[] {
  return toImagesFromParts(status.pic_ids, status.pic_infos)
}

/**
 * Gets image URL structs from status.
 */
export function getImageUrlStructs(
  status: Pick<WeiboStatus, 'url_struct' | 'text_raw' | 'text'>,
): (WeiboUrlStruct & {
  pic_ids: string[]
  pic_infos: Record<string, WeiboPicInfo>
})[] {
  if (!Array.isArray(status.url_struct)) {
    return []
  }

  const text = status.text_raw ?? status.text ?? ''

  return status.url_struct.filter(
    (
      entity,
    ): entity is WeiboUrlStruct & {
      pic_ids: string[]
      pic_infos: Record<string, WeiboPicInfo>
    } => {
      const shortUrl = entity.short_url?.trim() ?? ''
      return (
        Array.isArray(entity.pic_ids) &&
        entity.pic_ids.length > 0 &&
        Boolean(entity.pic_infos) &&
        Boolean(shortUrl) &&
        text.includes(shortUrl)
      )
    },
  )
}

/**
 * Converts comment images, checking url_struct if no direct images.
 */
export function toCommentImages(status: WeiboStatus): FeedImage[] {
  const directImages = toImages(status)
  if (directImages.length > 0) {
    return directImages
  }

  const seen = new Set<string>()
  return getImageUrlStructs(status)
    .flatMap((entity) => toImagesFromParts(entity.pic_ids, entity.pic_infos))
    .filter((image) => {
      if (seen.has(image.id)) {
        return false
      }
      seen.add(image.id)
      return true
    })
}
