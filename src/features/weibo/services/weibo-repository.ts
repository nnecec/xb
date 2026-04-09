import type { TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import type { StatusCommentsPage } from '@/features/weibo/models/status'
import type { StatusDetail } from '@/features/weibo/models/status'
import {
  adaptProfileInfoResponse,
  mergeProfileDetail,
  type ProfileDetailPayload,
  type ProfileInfoPayload,
} from '@/features/weibo/services/adapters/profile'
import {
  adaptStatusCommentsResponse,
  adaptStatusDetailResponse,
} from '@/features/weibo/services/adapters/status'
import type { WeiboTimelinePayload } from '@/features/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/features/weibo/services/adapters/timeline'
import { fetchWeiboJson } from '@/features/weibo/services/client'
import type { WeiboEndpointPath } from '@/features/weibo/services/endpoints'
import { WEIBO_ENDPOINTS } from '@/features/weibo/services/endpoints'

export type HomeTimelineTab = 'for-you' | 'following'
type ProfileLookup = { uid: string } | { screenName: string }

export interface LoadTimelineOptions {
  cursor?: string | null
}

function getTimelinePath(tab: HomeTimelineTab): WeiboEndpointPath {
  return tab === 'following' ? WEIBO_ENDPOINTS.following : WEIBO_ENDPOINTS.forYou
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
  const isFirstPage = !options.cursor
  if (tab === 'following') {
    return loadTimeline(getTimelinePath(tab), {
      list_id: '110001768015440',
      refresh: 4,
      count: 20,
      fid: '110001768015440',
      ...(isFirstPage ? { since_id: '0' } : { max_id: options.cursor }),
    })
  }

  return loadTimeline(getTimelinePath(tab), {
    [isFirstPage ? 'since_id' : 'max_id']: isFirstPage ? '0' : options.cursor,
  })
}

export async function loadStatusDetail(statusId: string): Promise<StatusDetail> {
  const payload = await fetchWeiboJson<unknown>(WEIBO_ENDPOINTS.statusDetail, {
    id: statusId,
  })

  return adaptStatusDetailResponse(payload)
}

export async function loadStatusLongText(mblogId: string): Promise<string> {
  const payload = await fetchWeiboJson<{ data?: { longTextContent?: string } }>(
    WEIBO_ENDPOINTS.statusLongText,
    {
      id: mblogId,
    },
  )

  return payload.data?.longTextContent ?? ''
}

export async function loadStatusComments(
  statusId: string,
  cursor?: string | null,
): Promise<StatusCommentsPage> {
  const payload = await fetchWeiboJson<unknown>(WEIBO_ENDPOINTS.statusComments, {
    flow: 0,
    is_reload: 1,
    id: statusId,
    is_show_bulletin: 2,
    is_mix: 0,
    count: 10,
    fetch_level: 0,
    locale: 'zh',
    max_id: cursor ?? undefined,
  })

  return adaptStatusCommentsResponse(payload as Parameters<typeof adaptStatusCommentsResponse>[0])
}

function getProfileInfoParams(lookup: ProfileLookup) {
  return 'screenName' in lookup
    ? { screen_name: lookup.screenName, scene: 'profile' }
    : { uid: lookup.uid }
}

async function fetchProfileInfo(lookup: ProfileLookup): Promise<UserProfile> {
  const payload = await fetchWeiboJson<ProfileInfoPayload>(
    WEIBO_ENDPOINTS.profileInfo,
    getProfileInfoParams(lookup),
  )

  return adaptProfileInfoResponse(payload)
}

async function fetchProfileDetail(uid: string): Promise<ProfileDetailPayload> {
  return fetchWeiboJson<ProfileDetailPayload>(WEIBO_ENDPOINTS.profileDetail, { uid })
}

export async function loadProfileHoverCard(lookup: ProfileLookup): Promise<UserProfile> {
  if ('screenName' in lookup) {
    const profile = await fetchProfileInfo(lookup)
    if (!profile.id) {
      throw new Error('weibo-profile-info-missing-id')
    }

    const detailPayload = await fetchProfileDetail(profile.id)
    return mergeProfileDetail(profile, detailPayload)
  }

  const [profile, detailPayload] = await Promise.all([
    fetchProfileInfo(lookup),
    fetchProfileDetail(lookup.uid),
  ])

  return mergeProfileDetail(profile, detailPayload)
}

export async function loadProfilePosts(profileId: string): Promise<TimelinePage> {
  return loadTimeline(WEIBO_ENDPOINTS.profilePosts, {
    uid: profileId,
    page: 1,
    feature: 0,
  })
}
