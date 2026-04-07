import type { TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import type { StatusDetail } from '@/features/weibo/models/status'
import type { WeiboEndpointPath } from '@/features/weibo/services/endpoints'
import { fetchWeiboJson } from '@/features/weibo/services/client'
import { adaptProfileInfoResponse } from '@/features/weibo/services/adapters/profile'
import { adaptStatusDetailResponse } from '@/features/weibo/services/adapters/status'
import type { WeiboTimelinePayload } from '@/features/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/features/weibo/services/adapters/timeline'
import { WEIBO_ENDPOINTS } from '@/features/weibo/services/endpoints'

export type HomeTimelineTab = 'for-you' | 'following'

export interface LoadTimelineOptions {
  cursor?: string | null
}

function getTimelinePath(tab: HomeTimelineTab): WeiboEndpointPath {
  return tab === 'following'
    ? WEIBO_ENDPOINTS.following
    : WEIBO_ENDPOINTS.forYou
}

async function loadTimeline(
  path: WeiboEndpointPath,
  params: Record<string, string | number | null | undefined>,
): Promise<TimelinePage> {
  const payload = await fetchWeiboJson<WeiboTimelinePayload>(path, params)
  return adaptTimelineResponse(payload)
}

export async function loadHomeTimeline(
  tab: HomeTimelineTab,
  options: LoadTimelineOptions = {},
): Promise<TimelinePage> {
  return loadTimeline(getTimelinePath(tab), {
    max_id: options.cursor ?? undefined,
  })
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

export async function loadProfileInfo(profileId: string): Promise<UserProfile> {
  const payload = await fetchWeiboJson<unknown>(WEIBO_ENDPOINTS.profileInfo, {
    uid: profileId,
  })

  return adaptProfileInfoResponse(payload as Parameters<typeof adaptProfileInfoResponse>[0])
}

export async function loadProfilePosts(profileId: string): Promise<TimelinePage> {
  return loadTimeline(WEIBO_ENDPOINTS.profilePosts, {
    uid: profileId,
    page: 1,
    feature: 0,
  })
}
