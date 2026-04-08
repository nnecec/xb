import type { TimelinePage } from '@/features/weibo/models/feed'
import {
  type WeiboStatus,
  toFeedItem,
} from '../../utils/transform'

export interface WeiboTimelineStatus extends WeiboStatus {}

export interface WeiboTimelinePayload {
  data?: {
    list?: Array<WeiboStatus | null | undefined>
    statuses?: Array<WeiboStatus | null | undefined>
    since_id?: number | string
  }
  max_id?: number | string
  statuses?: Array<WeiboStatus | null | undefined>
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return String(value)
}

function getTimelineStatuses(
  payload: WeiboTimelinePayload,
): WeiboStatus[] {
  const statuses = Array.isArray(payload.statuses)
    ? payload.statuses
    : Array.isArray(payload.data?.statuses)
      ? payload.data.statuses
      : Array.isArray(payload.data?.list)
        ? payload.data.list
        : []
  return statuses.filter(
    (status): status is WeiboStatus =>
      status !== null && typeof status === 'object' && status.isAd !== 1,
  )
}

export function adaptTimelineResponse(
  payload: WeiboTimelinePayload,
): TimelinePage {
  return {
    items: getTimelineStatuses(payload)
      .map(toFeedItem)
      .filter(item => item.id !== ''),
    nextCursor: normalizeCursor(payload.max_id ?? payload.data?.since_id),
  }
}
