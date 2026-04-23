import type { NotificationsPage } from '@/lib/weibo/models/notification'

import { type WeiboStatus, toFeedItem } from '../../utils/transform'

export interface WeiboMentionsPayload {
  ok?: number
  data?: {
    previous_cursor?: number | string
    total_number?: number
    tips_show?: number
    next_cursor?: number | string
    miss_count?: number
    hasvisible?: boolean
    miss_rank?: number
    miss_ids?: Array<number | string>
    statuses?: Array<WeiboStatus | null | undefined>
  }
  msg?: string
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }
  return String(value)
}

function getMentionsStatuses(payload: WeiboMentionsPayload): Array<WeiboStatus> {
  const statuses = payload.data?.statuses
  if (!Array.isArray(statuses)) {
    return []
  }
  return statuses.filter(
    (status): status is WeiboStatus =>
      status !== null && typeof status === 'object' && status.isAd !== 1,
  )
}

function parseWeiboDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 7) {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
    if (diffDays > 0) return `${diffDays}天`
    if (diffHours > 0) return `${diffHours}小时`
    if (diffMins > 0) return `${diffMins}分钟`
    return '刚刚'
  } catch {
    return dateStr
  }
}

function adaptUser(user?: {
  id: string
  name?: string
  screen_name?: string
  avatar_large?: string
  avatar_hd?: string
}) {
  if (!user) {
    return { id: '', name: '', avatarUrl: null }
  }
  return {
    id: String(user.id),
    name: user.name || user.screen_name || '',
    avatarUrl: user.avatar_large || user.avatar_hd || null,
  }
}

function adaptMentionNotification(status: WeiboStatus) {
  const feedItem = toFeedItem(status)
  return {
    id: String(status.id ?? ''),
    textRaw: status.text_raw || feedItem.text,
    user: adaptUser(status.user as Parameters<typeof adaptUser>[0]),
    status: {
      id: String(status.id ?? ''),
      text: feedItem.text,
      textRaw: status.text_raw || feedItem.text,
      author: adaptUser(status.user as Parameters<typeof adaptUser>[0]),
    },
    createdAtLabel: parseWeiboDate(status.created_at),
    source: status.source,
  }
}

export function adaptMentionsResponse(payload: WeiboMentionsPayload): NotificationsPage {
  const items = getMentionsStatuses(payload)
    .map(adaptMentionNotification)
    .filter((item) => item.id !== '')

  return {
    items,
    nextCursor: normalizeCursor(payload.data?.next_cursor),
  }
}
