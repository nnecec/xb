import type { TimelinePage } from '@/lib/weibo/models/feed'

import {
  deliverMweiboTopicPage,
  getMweiboTopicRecoveryState,
  type MweiboTopicRecoveryState,
} from './mweibo-topic-delivery'

export async function loadTopicSearch(
  topic: string,
  page: number,
  channelType?: string,
): Promise<TimelinePage> {
  return deliverMweiboTopicPage(topic, page, channelType)
}

export { getMweiboTopicRecoveryState }
export type { MweiboTopicRecoveryState }
