import { normalizeCursor } from '@/lib/weibo/data/io/cursor'
import type {
  WeiboEmoticonConfig,
  WeiboEmoticonGroup,
  WeiboEmoticonItem,
} from '@/lib/weibo/models/emoticon'
import type { CommentItem, StatusCommentsPage } from '@/lib/weibo/models/status'
import type { StatusDetail } from '@/lib/weibo/models/status'
import type { CommentFilterOption } from '@/lib/weibo/models/status'
import type { WeiboStatus } from '@/lib/weibo/models/weibo-api'
import type { WeiboLongTextData } from '@/lib/weibo/models/weibo-api'

interface WeiboEmoticonPayload {
  data?: { emoticon?: Record<string, Record<string, Array<{ phrase?: string; url?: string }>>> }
  emoticon?: Record<string, Record<string, Array<{ phrase?: string; url?: string }>>>
}

function adaptEmoticonConfigResponse(payload: WeiboEmoticonPayload): WeiboEmoticonConfig {
  const root = payload.data?.emoticon ?? payload.emoticon ?? {}
  const locale = root.ZH_CN ?? Object.values(root)[0] ?? {}
  const groups: WeiboEmoticonGroup[] = []
  const phraseMap: Record<string, WeiboEmoticonItem> = {}
  for (const [title, entries] of Object.entries(locale)) {
    const items = entries
      .map((entry) => {
        const phrase = entry.phrase?.trim() ?? ''
        const url = entry.url?.trim() ?? ''
        return phrase && url ? { phrase, url } : null
      })
      .filter((item): item is WeiboEmoticonItem => item !== null)
    groups.push({ title, items })
    for (const item of items) phraseMap[item.phrase] = item
  }
  return { groups, phraseMap }
}
import { wbGet } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'
import { toCommentItem, toFeedItem } from '@/lib/weibo/utils/transform'

interface StatusCommentsPayload {
  data?: WeiboStatus[]
  max_id?: string | number
  filter_group?: CommentFilterOption[]
  total_number?: number
}

function isWeiboStatusLike(value: unknown): value is WeiboStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>
  return 'user' in object || typeof object.idstr === 'string' || 'retweeted_status' in object
}

function adaptStatusDetailResponse(payload: unknown): StatusDetail {
  const root = payload as Record<string, unknown> | null
  const data = root && typeof root.data === 'object' && root.data !== null ? root.data : payload
  return { status: toFeedItem(isWeiboStatusLike(data) ? data : ({} as WeiboStatus)) }
}

function adaptStatusCommentsResponse(payload: StatusCommentsPayload): StatusCommentsPage {
  return {
    items: Array.isArray(payload.data) ? payload.data.map(toCommentItem) : [],
    nextCursor: normalizeCursor(payload.max_id),
    filterGroup: payload.filter_group,
    total: payload.total_number,
  }
}

export async function loadStatusDetail(statusId: string): Promise<StatusDetail> {
  const payload = await wbGet<unknown>(WEIBO_ENDPOINTS.statusDetail, {
    id: statusId,
    isGetLongText: 1,
  })

  return adaptStatusDetailResponse(payload)
}

export async function loadStatusLongText(mblogId: string): Promise<WeiboLongTextData | null> {
  const payload = await wbGet<{ data?: WeiboLongTextData }>(WEIBO_ENDPOINTS.statusLongText, {
    id: mblogId,
  })

  return payload.data ?? null
}

export async function loadEmoticonConfig(): Promise<WeiboEmoticonConfig> {
  const payload = await wbGet<WeiboEmoticonPayload>(WEIBO_ENDPOINTS.statusConfig)
  return adaptEmoticonConfigResponse(payload)
}

export async function loadNestedComments(
  statusId: string,
  uid: string,
  cursor?: string | null,
): Promise<StatusCommentsPage> {
  const payload = await wbGet<unknown>(WEIBO_ENDPOINTS.statusComments, {
    flow: 1,
    id: statusId,
    uid,
    is_reload: 1,
    is_show_bulletin: 2,
    is_mix: 1,
    fetch_level: 1,
    count: 20,
    max_id: cursor ?? 0,
    locale: 'en',
  })

  return adaptStatusCommentsResponse(payload as Parameters<typeof adaptStatusCommentsResponse>[0])
}

export async function loadStatusComments(
  statusId: string,
  uid: string,
  cursor?: string | null,
  filterParam?: string,
): Promise<StatusCommentsPage> {
  const filterParams: Record<string, string> = {}
  if (filterParam) {
    const [key, value] = filterParam.split('=')
    if (key && value) {
      filterParams[key] = value
    }
  }

  const payload = await wbGet<unknown>(WEIBO_ENDPOINTS.statusComments, {
    id: statusId,
    uid,
    flow: 0,
    is_reload: 1,
    is_show_bulletin: 2,
    is_mix: 0,
    count: 10,
    fetch_level: 0,
    locale: 'zh',
    max_id: cursor ?? undefined,
    ...filterParams,
  })

  return adaptStatusCommentsResponse(payload as Parameters<typeof adaptStatusCommentsResponse>[0])
}

export interface FeedCommentsResult {
  items: CommentItem[]
  totalNumber: number
}

export async function loadFeedComments(statusId: string, uid: string): Promise<FeedCommentsResult> {
  const payload = await wbGet<unknown>(WEIBO_ENDPOINTS.statusComments, {
    is_reload: 1,
    id: statusId,
    is_show_bulletin: 2,
    is_mix: 0,
    count: 20,
    type: 'feed',
    uid,
    fetch_level: 0,
    locale: 'en',
  })

  const adapted = adaptStatusCommentsResponse(
    payload as Parameters<typeof adaptStatusCommentsResponse>[0],
  )
  const rawPayload = payload as Record<string, unknown>
  const totalNumber = typeof rawPayload.total_number === 'number' ? rawPayload.total_number : 0

  return {
    items: adapted.items,
    totalNumber,
  }
}
