import type { TimelinePage } from '@/lib/weibo/models/feed'
import {
  adaptMweiboTopicResponse,
  type MweiboTopicPayload,
} from '@/lib/weibo/services/adapters/m-weibo-topic'
import { buildTopicSearchUrl, mweiboFetch } from '@/lib/weibo/services/m-weibo-client'

export async function loadTopicSearch(
  topic: string,
  page: number,
  channelType?: string,
): Promise<TimelinePage> {
  const url = buildTopicSearchUrl(topic, page, channelType)
  const payload = await mweiboFetch<MweiboTopicPayload>(url)
  return adaptMweiboTopicResponse(payload, page)
}
