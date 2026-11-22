/**
 * Main exports for Weibo data transformation.
 * Re-exports all public APIs from sub-modules.
 */

// Types
export type {
  WeiboStatusUser,
  WeiboPageInfo,
  WeiboPicInfo,
  WeiboStatus,
  WeiboLongTextData,
} from '@/lib/weibo/models/weibo-api'

// Media transformation
export { toMedia } from './media'

// Status transformation
export { toFeedItem, mergeLongTextIntoFeedItem } from './status'

// Comment transformation
export { toCommentItem } from './comments'
