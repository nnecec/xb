/**
 * Comment transformation utilities for Weibo data.
 * Converts Weibo comment objects to CommentItem format.
 */

import type { CommentItem } from '@/lib/weibo/models/status'
import type { WeiboStatus } from '@/lib/weibo/models/weibo-api'
import { formatCreatedAt } from '@/lib/weibo/services/utils/date'

import { getStatusAuthor } from './author'
import { extractEmoticonsFromHtml, stripEntityTokens, stripHtmlTags } from './helpers'
import { getImageUrlStructs, toCommentImages } from './images'
import { toFeedItem } from './status'
import { getStatusId, getStatusText, toUrlEntities } from './text-entities'

/**
 * Converts Weibo comment to CommentItem format.
 */
export function toCommentItem(comment: WeiboStatus): CommentItem {
  const commentImageTokens = getImageUrlStructs(comment)
    .map((entity) => entity.short_url?.trim() ?? '')
    .filter(Boolean)
  const urlEntities = toUrlEntities(comment, { excludeImageEntities: true })
  const images = toCommentImages(comment)
  const normalizedCommentText = stripEntityTokens(getStatusText(comment), commentImageTokens)
  const replyCommentText = getStatusText(comment.reply_comment ?? {})
  const replyCommentImageTokens = getImageUrlStructs(comment.reply_comment ?? {})
    .map((entity) => entity.short_url?.trim() ?? '')
    .filter(Boolean)
  const normalizedReplyCommentText = stripEntityTokens(replyCommentText, replyCommentImageTokens)
  const emoticons = extractEmoticonsFromHtml(comment.text)

  const normalizedRetweetedStatus = comment.retweeted_status
    ? {
        ...comment.retweeted_status,
        pic_ids: comment.retweeted_status.pic_ids ?? [],
        pic_infos: comment.retweeted_status.pic_infos ?? {},
        url_struct: comment.retweeted_status.url_struct ?? [],
        topic_struct: comment.retweeted_status.topic_struct ?? [],
      }
    : null

  return {
    id: getStatusId(comment),
    text: normalizedCommentText,
    createdAtLabel: formatCreatedAt(comment.created_at ?? ''),
    author: getStatusAuthor(comment.user),
    likeCount: Number(comment.like_counts ?? 0),
    liked: Boolean(comment.attitudes_status ?? (comment as { liked?: boolean }).liked),
    source: stripHtmlTags(comment.source ?? ''),
    ...(Object.keys(emoticons).length > 0 ? { emoticons } : {}),
    ...(urlEntities.length > 0 ? { urlEntities } : {}),
    images,
    replyComment: comment.reply_comment
      ? {
          id: getStatusId(comment.reply_comment),
          text: normalizedReplyCommentText,
          author: getStatusAuthor(comment.reply_comment.user),
          ...(Object.keys(extractEmoticonsFromHtml(comment.reply_comment.text)).length > 0
            ? { emoticons: extractEmoticonsFromHtml(comment.reply_comment.text) }
            : {}),
          images: toCommentImages(comment.reply_comment),
          ...(toUrlEntities(comment.reply_comment, { excludeImageEntities: true }).length > 0
            ? { urlEntities: toUrlEntities(comment.reply_comment, { excludeImageEntities: true }) }
            : {}),
        }
      : null,
    comments: Array.isArray(comment.comments) ? comment.comments.map(toCommentItem) : [],
    moreInfoText: comment.more_info?.text ?? undefined,
    ...(normalizedRetweetedStatus
      ? { retweetedStatus: toFeedItem(normalizedRetweetedStatus, false) }
      : {}),
  }
}
