import type { NotificationsPage } from '@/lib/weibo/models/notification'

interface WeiboComment {
  id: string
  text: string
  created_at: string
  source: string
  user?: {
    id: string
    name?: string
    screen_name?: string
    profile_url?: string
    avatar_large?: string
    avatar_hd?: string
  }
  status?: {
    id: string
    text: string
    user?: {
      id: string
      name?: string
      screen_name?: string
    }
  }
  reply_comment?: {
    id: string
    text: string
    user?: {
      id: string
      name?: string
      screen_name?: string
    }
  }
}

export interface WeiboCommentsPayload {
  ok?: number
  data?: {
    total_number?: number
    next_cursor?: number | string
    miss_count?: number
    comments?: Array<WeiboComment | null | undefined>
  }
  msg?: string
}

function normalizeCursor(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '' || String(value) === '0') {
    return null
  }
  return String(value)
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

function adaptComment(comment: WeiboComment) {
  const text = comment.text?.replace(/<[^>]+>/g, '') || ''

  return {
    id: comment.id,
    text,
    user: adaptUser(comment.user),
    status: comment.status
      ? {
          id: String(comment.status.id),
          text: comment.status.text || '',
          author: adaptUser(comment.status.user),
        }
      : undefined,
    replyComment: comment.reply_comment
      ? {
          id: String(comment.reply_comment.id),
          text: comment.reply_comment.text?.replace(/<[^>]+>/g, '') || '',
          user: adaptUser(comment.reply_comment.user),
        }
      : undefined,
    createdAtLabel: parseWeiboDate(comment.created_at),
    source: comment.source?.replace(/<[^>]+>/g, '') || '',
  }
}

export function adaptCommentsResponse(payload: WeiboCommentsPayload): NotificationsPage {
  const comments = payload.data?.comments ?? []
  const items = comments
    .filter((c): c is WeiboComment => c !== null && c !== undefined && typeof c === 'object')
    .map(adaptComment)

  return {
    items,
    nextCursor: normalizeCursor(payload.data?.next_cursor),
  }
}
