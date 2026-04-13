import type { TimelinePage } from '@/features/weibo/models/feed'

import { type WeiboStatus, toFeedItem } from '../../utils/transform'

export interface WeiboTimelineStatus extends WeiboStatus {}

export interface WeiboTimelinePayload {
  data?: {
    list?: Array<WeiboStatus | null | undefined>
    statuses?: Array<WeiboStatus | null | undefined>
    status?: Array<WeiboStatus | null | undefined>
    since_id?: number | string
  }
  max_id?: number | string
  statuses?: Array<WeiboStatus | null | undefined>
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }

  return String(value)
}

function getTimelineStatuses(payload: WeiboTimelinePayload): WeiboStatus[] {
  const statuses = Array.isArray(payload.statuses)
    ? payload.statuses
    : Array.isArray(payload.data?.statuses)
      ? payload.data.statuses
      : Array.isArray(payload.data?.status)
        ? payload.data.status
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
  pageForCursor?: number,
): TimelinePage {
  const items = getTimelineStatuses(payload)
    .map((status) => toFeedItem(status))
    .filter((item) => item.id !== '')

  if (pageForCursor !== undefined) {
    return {
      items,
      nextCursor: items.length > 0 ? String(pageForCursor + 1) : null,
    }
  }

  return {
    items,
    nextCursor: normalizeCursor(payload.max_id ?? payload.data?.since_id),
  }
}
