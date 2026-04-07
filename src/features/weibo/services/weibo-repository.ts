import type { TimelinePage } from '@/features/weibo/models/feed'
import type { StatusDetail } from '@/features/weibo/models/status'
import { fetchWeiboJson } from '@/features/weibo/services/client'
import { adaptStatusDetailResponse } from '@/features/weibo/services/adapters/status'
import { adaptTimelineResponse } from '@/features/weibo/services/adapters/timeline'
import { WEIBO_ENDPOINTS } from '@/features/weibo/services/endpoints'

export type HomeTimelineTab = 'for-you' | 'following'

export interface LoadTimelineOptions {
  cursor?: string | null
}

function getTimelinePath(tab: HomeTimelineTab): string {
  return tab === 'following'
    ? WEIBO_ENDPOINTS.following
    : WEIBO_ENDPOINTS.forYou
}

export async function loadHomeTimeline(
  tab: HomeTimelineTab,
  options: LoadTimelineOptions = {},
): Promise<TimelinePage> {
  const payload = await fetchWeiboJson<unknown>(getTimelinePath(tab), {
    max_id: options.cursor ?? undefined,
  })

  return adaptTimelineResponse(payload as Parameters<typeof adaptTimelineResponse>[0])
}

export async function loadSideCards(): Promise<unknown> {
  return fetchWeiboJson<unknown>(WEIBO_ENDPOINTS.sideCards, {})
}

export async function loadStatusDetail(statusId: string): Promise<StatusDetail> {
  const payload = await fetchWeiboJson<unknown>(WEIBO_ENDPOINTS.statusDetail, {
    id: statusId,
  })

  return adaptStatusDetailResponse(payload as Parameters<typeof adaptStatusDetailResponse>[0])
}
