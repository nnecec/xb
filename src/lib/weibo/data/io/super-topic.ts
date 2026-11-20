import type { SuperTopicPage } from '@/lib/weibo/models/super-topic'
import { normalizeSafeExternalUrl } from '@/lib/weibo/utils/safe-url'

interface SuperTopicPayloadItem {
  title?: unknown
  content1?: unknown
  content2?: unknown
  link?: unknown
  pic?: unknown
  oid?: unknown
  topic_name?: unknown
  status_count?: unknown
  follow_count?: unknown
  intro?: unknown
}

export interface SuperTopicPayload {
  data?: {
    name?: unknown
    list?: SuperTopicPayloadItem[]
    total_number?: unknown
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function adaptSuperTopicResponse(payload: SuperTopicPayload): SuperTopicPage {
  const list = payload.data?.list ?? []

  return {
    name: asString(payload.data?.name) || '我关注的超话',
    totalNumber: asNumber(payload.data?.total_number),
    items: list.map((item) => {
      const intro = asString(item.intro) || asString(item.content1)
      return {
        title: asString(item.title),
        intro,
        fansText: asString(item.content2),
        link: normalizeSafeExternalUrl(asString(item.link)) ?? '',
        pic: asString(item.pic),
        oid: asString(item.oid),
        topicName: asString(item.topic_name) || asString(item.title),
        statusCount: asNumber(item.status_count),
        followCount: asNumber(item.follow_count),
      }
    }),
  }
}
