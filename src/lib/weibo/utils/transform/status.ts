/**
 * Status transformation utilities for Weibo data.
 * Converts Weibo status objects to FeedItem format.
 */

import type { FeedEmoticon, FeedImage, FeedItem } from '@/lib/weibo/models/feed'
import type { WeiboLongTextData, WeiboStatus } from '@/lib/weibo/models/weibo-api'
import { formatCreatedAt } from '@/lib/weibo/services/utils/date'

import { getStatusAuthor } from './author'
import { extractEmoticonsFromHtml, stripHtmlTags, uniqueBy } from './helpers'
import { getImageUrlStructs, toImages, toImagesFromParts } from './images'
import { toMedia, toMixMediaInfo } from './media'
import {
  getStatusId,
  getStatusMarkdownText,
  getStatusText,
  toTopicEntities,
  toUrlEntities,
} from './text-entities'

/**
 * Picks value from analysis_extra field.
 */
function pickAnalysisExtraValue(analysisExtra: string | undefined, key: string): string | null {
  if (!analysisExtra) {
    return null
  }
  const match = analysisExtra.match(new RegExp(`${key}:([^|]+)`))
  return match?.[1] ?? null
}

/**
 * Checks if media should be attached to retweeted status.
 */
function shouldAttachMediaToRetweeted(status: WeiboStatus): boolean {
  const retweetedId = String(
    status.retweeted_status?.idstr ??
      status.retweeted_status?.mid ??
      status.retweeted_status?.id ??
      '',
  )
  if (!retweetedId) {
    return false
  }

  const mediaAuthorMid = String(
    status.page_info?.media_info?.author_mid ?? status.page_info?.author_mid ?? '',
  )
  if (mediaAuthorMid && mediaAuthorMid === retweetedId) {
    return true
  }

  const rootMid = pickAnalysisExtraValue(status.analysis_extra, 'mblog_rt_mid')
  return rootMid === retweetedId
}

/**
 * Converts Weibo status to FeedItem format.
 */
export function toFeedItem(status: WeiboStatus, includeRetweeted = true): FeedItem {
  const mediaBelongsToRetweeted =
    includeRetweeted && Boolean(status.retweeted_status) && shouldAttachMediaToRetweeted(status)
  const normalizedRetweetedStatus =
    includeRetweeted && status.retweeted_status
      ? {
          ...status.retweeted_status,
          page_info:
            mediaBelongsToRetweeted && !status.retweeted_status.page_info
              ? status.page_info
              : status.retweeted_status.page_info,
          pic_ids:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.pic_ids) ||
              status.retweeted_status.pic_ids.length === 0)
              ? status.pic_ids
              : status.retweeted_status.pic_ids,
          pic_infos:
            mediaBelongsToRetweeted &&
            (!status.retweeted_status.pic_infos ||
              Object.keys(status.retweeted_status.pic_infos).length === 0)
              ? status.pic_infos
              : status.retweeted_status.pic_infos,
          url_struct:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.url_struct) ||
              status.retweeted_status.url_struct.length === 0)
              ? status.url_struct
              : status.retweeted_status.url_struct,
          topic_struct:
            mediaBelongsToRetweeted &&
            (!Array.isArray(status.retweeted_status.topic_struct) ||
              status.retweeted_status.topic_struct.length === 0)
              ? status.topic_struct
              : status.retweeted_status.topic_struct,
        }
      : null
  const imageUrlStructs = getImageUrlStructs(status)
  const imageEntities: Record<string, FeedImage[]> = {}
  for (const entity of imageUrlStructs) {
    const shortUrl = entity.short_url?.trim()
    if (!shortUrl) continue
    const imgs = toImagesFromParts(entity.pic_ids, entity.pic_infos)
    if (imgs.length === 0) continue
    imageEntities[shortUrl] = imgs
  }
  const hasImageEntities = Object.keys(imageEntities).length > 0
  const urlEntities = toUrlEntities(status, { excludeImageEntities: hasImageEntities })
  const topicEntities = toTopicEntities(status)
  const emoticons = extractEmoticonsFromHtml(status.text)
  const markdownText = getStatusMarkdownText(status)

  return {
    id: getStatusId(status),
    mblogId: status.mblogid ?? null,
    isLongText: Boolean(status.isLongText && !status.longText),
    deleted: status.deleted === '1',
    liked: Boolean(status.attitudes_status),
    favorited: Boolean(status.favorited),
    text: getStatusText(status),
    ...(status.isMarkdown ? { isMarkdown: true } : {}),
    ...(markdownText ? { markdownText } : {}),
    createdAt: status.created_at ?? '',
    createdAtLabel: formatCreatedAt(status.created_at ?? ''),
    author: getStatusAuthor(status.user),
    stats: {
      likes: Number(status.attitudes_count ?? 0),
      comments: Number(status.comments_count ?? 0),
      reposts: Number(status.reposts_count ?? 0),
    },
    images: mediaBelongsToRetweeted ? [] : toImages(status),
    ...(hasImageEntities ? { imageEntities } : {}),
    media: mediaBelongsToRetweeted ? null : toMedia(status),
    mixMediaInfo: toMixMediaInfo(status.mix_media_info),
    ...(Object.keys(emoticons).length > 0 ? { emoticons } : {}),
    ...(urlEntities.length > 0 ? { urlEntities } : {}),
    ...(topicEntities.length > 0 ? { topicEntities } : {}),
    regionName: status.region_name ?? '',
    source: stripHtmlTags(status.source ?? ''),
    ...(status.title?.text ? { title: { text: status.title.text } } : {}),
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}

/**
 * Merges long text data into FeedItem.
 */
export function mergeLongTextIntoFeedItem(item: FeedItem, longText: WeiboLongTextData): FeedItem {
  const longTextStatus: WeiboStatus = {
    text: longText.longTextContent ?? '',
    text_raw: longText.longTextContent_raw ?? longText.longTextContent ?? '',
    isMarkdown: longText.isMarkdown ?? item.isMarkdown,
    pic_ids: longText.pic_ids ?? [],
    pic_infos: longText.pic_infos ?? {},
    topic_struct: longText.topic_struct ?? [],
    url_struct: longText.url_struct ?? [],
  }

  const imageUrlStructs = getImageUrlStructs(longTextStatus)
  const longTextImageEntities: Record<string, FeedImage[]> = {}
  for (const entity of imageUrlStructs) {
    const shortUrl = entity.short_url?.trim()
    if (!shortUrl) continue
    const imgs = toImagesFromParts(entity.pic_ids, entity.pic_infos)
    if (imgs.length === 0) continue
    longTextImageEntities[shortUrl] = imgs
  }
  const mergedImageEntities = { ...item.imageEntities, ...longTextImageEntities }
  const hasImageEntities = Object.keys(mergedImageEntities).length > 0
  const mergedImages = uniqueBy<FeedImage>(
    [...item.images, ...toImages(longTextStatus)],
    (image) => image.id,
  )
  const text = getStatusText(longTextStatus)
  const markdownText = getStatusMarkdownText(longTextStatus)
  const mergedUrlEntities = uniqueBy(
    [
      ...toUrlEntities(longTextStatus, { excludeImageEntities: hasImageEntities }),
      ...(item.urlEntities ?? []).filter(
        (entity) => text.includes(entity.shortUrl) && !(entity.shortUrl in mergedImageEntities),
      ),
    ],
    (entity) => entity.shortUrl,
  )
  const mergedTopicEntities = uniqueBy(
    [
      ...toTopicEntities(longTextStatus),
      ...(item.topicEntities ?? []).filter((entity) => text.includes(`#${entity.title}#`)),
    ],
    (entity) => entity.title,
  )
  const mergedEmoticons: Record<string, FeedEmoticon> = {
    ...item.emoticons,
    ...extractEmoticonsFromHtml(longText.longTextContent),
  }

  return {
    ...item,
    isLongText: false,
    text,
    ...(item.isMarkdown || longText.isMarkdown ? { isMarkdown: true } : {}),
    markdownText,
    images: mergedImages,
    imageEntities: hasImageEntities ? mergedImageEntities : undefined,
    emoticons: Object.keys(mergedEmoticons).length > 0 ? mergedEmoticons : undefined,
    urlEntities: mergedUrlEntities.length > 0 ? mergedUrlEntities : undefined,
    topicEntities: mergedTopicEntities.length > 0 ? mergedTopicEntities : undefined,
  }
}
