import { format } from 'date-fns'

import type { FeedItem } from '../../models/feed'
import type { ShareCardData } from './types'

export function transformFeedItem(item: FeedItem): ShareCardData {
  return {
    author: {
      name: item.author.name,
      avatarUrl: item.author.avatarUrl,
      id: item.author.id,
    },
    text: item.text,
    images: item.images,
    videoCoverUrl: item.media?.coverUrl,
    stats: {
      likes: item.stats.likes,
      comments: item.stats.comments,
      reposts: item.stats.reposts,
    },
    createdAt: item.createdAt,
    createdAtLabel: item.createdAtLabel,
    mblogId: item.mblogId,
    source: item.source,
    regionName: item.regionName,
    retweetedStatus: item.retweetedStatus
      ? transformFeedItem(item.retweetedStatus as FeedItem)
      : undefined,
    // Entity data for StatusText
    emoticons: item.emoticons,
    urlEntities: item.urlEntities,
    topicEntities: item.topicEntities,
    imageEntities: item.imageEntities,
  }
}

export function formatCount(count: number): string {
  if (count >= 10_000) {
    return `${(count / 10_000).toFixed(1)}万`
  }
  return count.toLocaleString()
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
  } catch {
    return dateString
  }
}

export function getDisplayImages(
  images: ShareCardData['images'],
  videoCoverUrl?: string | null,
): ShareCardData['images'] {
  if (images.length > 0) {
    return images
  }
  if (videoCoverUrl) {
    return [{ id: 'video-cover', thumbnailUrl: videoCoverUrl, largeUrl: videoCoverUrl }]
  }
  return []
}
