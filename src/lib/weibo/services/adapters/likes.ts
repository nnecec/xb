import type { NotificationsPage } from '@/lib/weibo/models/notification'

// Shape of a single attitude (like) entry returned from Weibo's /ajax/message/attitudes
interface WeiboLikeAttitude {
  id: number | string
  user?: {
    id: string
    name?: string
    screen_name?: string
    avatar_large?: string
    avatar_hd?: string
  }
  comment?: {
    id: number | string
    text: string
    reply_original_text?: string
    user?: {
      id: string
      name?: string
      screen_name?: string
      avatar_large?: string
      avatar_hd?: string
    }
    status?: {
      id: string
      text?: string
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
  page_info?: {
    page_pic?: string
    content1?: string
    uidPageInfo?: string
    content2?: string
    mblogid?: string
  }
  created_at?: string
  source?: string
}

export interface WeiboLikesPayload {
  ok?: number
  data?: {
    attitudes?: Array<WeiboLikeAttitude | null | undefined>
    next_cursor?: number | string
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
    return { id: '', name: '', avatarUrl: null as string | null }
  }
  return {
    id: String(user.id),
    name: user.name || user.screen_name || '',
    avatarUrl: user.avatar_large || user.avatar_hd || null,
  }
}

function adaptLikeAttitude(att: WeiboLikeAttitude) {
  const status = att.comment?.text
    ? {
        id: att.comment.status?.id ? String(att.comment.status.id) : '',
        text: att.comment.reply_original_text ?? att.comment.text,
        author: adaptUser(att.comment.user),
      }
    : att.page_info?.content2
      ? {
          id: att.page_info.mblogid ? String(att.page_info.mblogid) : '',
          text: att.page_info.content2,
          author: {
            id: att.page_info.uidPageInfo ?? '',
            name: att.page_info.content1?.replace(/^@/, '') ?? '',
            avatarUrl: att.page_info.page_pic ?? null,
          },
        }
      : {
          id: '',
          text: '',
          author: adaptUser(undefined),
        }

  return {
    id: String(att.id),
    user: adaptUser(att.user),
    status,
    createdAtLabel: parseWeiboDate(att.created_at),
    source: att.source?.replace(/<[^>]+>/g, '') ?? '',
  }
}

export function adaptLikes(payload: WeiboLikesPayload): NotificationsPage {
  const attitudes = payload.data?.attitudes ?? []
  const items = attitudes
    .filter((a): a is WeiboLikeAttitude => a !== null && a !== undefined && typeof a === 'object')
    .map(adaptLikeAttitude)

  return {
    items,
    nextCursor: normalizeCursor(payload.data?.next_cursor),
  }
}
