import type { StatusCommentsPage, StatusDetail } from '@/features/weibo/models/status'
import {
  type WeiboStatus,
  toFeedItem,
} from '../../utils/transform'

export type { WeiboStatus }

interface StatusPayload extends WeiboStatus {
  comments?: WeiboStatus[] // old shape
}

interface StatusCommentsPayload {
  data?: WeiboStatus[]
  max_id?: string | number
}

function normalizeCursor(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }
  return String(value)
}

export function adaptStatusDetailResponse(payload: StatusPayload): StatusDetail {
  return {
    status: toFeedItem(payload),
  }
}

export function adaptStatusCommentsResponse(payload: StatusCommentsPayload): StatusCommentsPage {
  return {
    items: Array.isArray(payload.data) ? payload.data.map(toFeedItem) : [],
    nextCursor: normalizeCursor(payload.max_id),
  }
}
