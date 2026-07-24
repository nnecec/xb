import type { WeiboEmoticonConfig } from '@/lib/weibo/models/emoticon'
import type { CommentItem, StatusCommentsPage } from '@/lib/weibo/models/status'
import type { StatusDetail } from '@/lib/weibo/models/status'
import {
  adaptEmoticonConfigResponse,
  type WeiboEmoticonPayload,
} from '@/lib/weibo/services/adapters/emoticon'
import {
  adaptStatusCommentsResponse,
  adaptStatusDetailResponse,
} from '@/lib/weibo/services/adapters/status'
import { wbGet } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'
import type { WeiboLongTextData } from '@/lib/weibo/utils/transform'

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
