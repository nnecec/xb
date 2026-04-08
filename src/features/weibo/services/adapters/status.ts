import type { StatusCommentsPage, StatusDetail } from '@/features/weibo/models/status'
import {
  type WeiboStatus,
  toCommentItem,
  toFeedItem,
} from '../../utils/transform'

export type { WeiboStatus }

interface StatusCommentsPayload {
  data?: WeiboStatus[]
  max_id?: string | number
}

function isWeiboStatusLike(value: unknown): value is WeiboStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    'user' in o ||
    typeof o.idstr === 'string' ||
    typeof o.mid === 'string' ||
    typeof o.mid === 'number' ||
    'retweeted_status' in o
  )
}

/** PC `/ajax/statuses/show` often returns `{ ok, data: mblog }`; unwrap so `toFeedItem` sees `retweeted_status`. */
function unwrapStatusDetailPayload(payload: unknown): WeiboStatus {
  if (!payload || typeof payload !== 'object') {
    return {} as WeiboStatus
  }
  const root = payload as Record<string, unknown>
  if ('data' in root && root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const data = root.data
    if (isWeiboStatusLike(data)) {
      return data as WeiboStatus
    }
  }
  return payload as WeiboStatus
}

function normalizeCursor(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }
  return String(value)
}

export function adaptStatusDetailResponse(payload: unknown): StatusDetail {
  return {
    status: toFeedItem(unwrapStatusDetailPayload(payload)),
  }
}

export function adaptStatusCommentsResponse(payload: StatusCommentsPayload): StatusCommentsPage {
  return {
    items: Array.isArray(payload.data) ? payload.data.map(toCommentItem) : [],
    nextCursor: normalizeCursor(payload.max_id),
  }
}
