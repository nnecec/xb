import type { TimelinePage } from '@/lib/weibo/models/feed'
import type { ProfileFollowGroup, UserProfile } from '@/lib/weibo/models/profile'
import type { ProfileSearchFilters } from '@/lib/weibo/route/profile-search-params'
import {
  adaptProfileInfoResponse,
  mergeProfileDetail,
  type ProfileDetailPayload,
  type ProfileInfoPayload,
} from '@/lib/weibo/services/adapters/profile'
import type { WeiboTimelinePayload } from '@/lib/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/lib/weibo/services/adapters/timeline'
import { wbGet } from '@/lib/weibo/services/client'
import { wbPostForm } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'

import { isWeiboMutationSuccess, type WeiboMutationResponse } from './shared'

type ProfileLookup = { uid: string } | { screenName: string }

export interface ProfileSearchPage extends TimelinePage {
  total?: string
  matchedQuery?: string
}

export interface LoadProfileSearchParams {
  query: string
  starttime: number | null
  endtime: number
  filters: ProfileSearchFilters
}

interface ProfileFollowGroupPayload {
  id?: string | number
  idstr?: string
  name?: string
  mode?: string
  member_count?: number
  exist?: number | boolean
}

interface ProfileAssignedGroupsPayload {
  data?: ProfileFollowGroupPayload[]
  ok?: number
}

interface ProfileAvailableGroupsPayload {
  data?: {
    lists?: ProfileFollowGroupPayload[]
    total_number?: number
  }
  ok?: number
}

interface ProfileCreateGroupPayload {
  data?: ProfileFollowGroupPayload
  ok?: number
  msg?: string
  message?: string
}

function adaptProfileFollowGroup(raw: ProfileFollowGroupPayload): ProfileFollowGroup | null {
  const id = raw.idstr ?? (raw.id != null ? String(raw.id) : '')
  if (!id || id === '0') {
    return null
  }

  return {
    id,
    idstr: id,
    name: raw.name ?? '未命名分组',
    mode: raw.mode ?? null,
    memberCount: raw.member_count ?? null,
    exist: raw.exist === true || raw.exist === 1,
  }
}

function adaptProfileFollowGroups(groups: ProfileFollowGroupPayload[] = []): ProfileFollowGroup[] {
  return groups.flatMap((group) => {
    const adapted = adaptProfileFollowGroup(group)
    return adapted ? [adapted] : []
  })
}

function getProfileInfoParams(lookup: ProfileLookup) {
  return 'screenName' in lookup
    ? { screen_name: lookup.screenName, scene: 'profile' }
    : { uid: lookup.uid }
}

async function fetchProfileInfo(lookup: ProfileLookup): Promise<UserProfile> {
  const payload = await wbGet<ProfileInfoPayload>(
    WEIBO_ENDPOINTS.profileInfo,
    getProfileInfoParams(lookup),
  )

  return adaptProfileInfoResponse(payload)
}

async function fetchProfileDetail(uid: string): Promise<ProfileDetailPayload> {
  return wbGet<ProfileDetailPayload>(WEIBO_ENDPOINTS.profileDetail, { uid })
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

export async function loadProfilePosts(profileId: string, page: number): Promise<TimelinePage> {
  const payload = await wbGet<WeiboTimelinePayload>(WEIBO_ENDPOINTS.profilePosts, {
    uid: profileId,
    page,
    feature: 0,
  })
  return adaptTimelineResponse(payload, page)
}

export async function loadProfileSearchPosts(
  uid: string,
  params: LoadProfileSearchParams,
  page: number,
): Promise<ProfileSearchPage> {
  const payload = await wbGet<
    WeiboTimelinePayload & { data?: { total?: string; absstr?: string } }
  >(WEIBO_ENDPOINTS.profileSearch, {
    uid,
    page,
    q: params.query,
    ...(params.starttime !== null ? { starttime: params.starttime } : {}),
    endtime: params.endtime,
    hasori: params.filters.hasori ? 1 : 0,
    hasret: params.filters.hasret ? 1 : 0,
    hastext: params.filters.hastext ? 1 : 0,
    haspic: params.filters.haspic ? 1 : 0,
    hasvideo: params.filters.hasvideo ? 1 : 0,
    hasmusic: params.filters.hasmusic ? 1 : 0,
  })
  const pageData = adaptTimelineResponse(payload, page)
  return {
    ...pageData,
    total: payload.data?.total,
    matchedQuery: payload.data?.absstr,
  }
}

export async function loadProfileAssignedGroups(uid: string): Promise<ProfileFollowGroup[]> {
  const payload = await wbGet<ProfileAssignedGroupsPayload>(WEIBO_ENDPOINTS.profileGroupList, {
    uid,
  })
  return adaptProfileFollowGroups(payload.data)
}

export async function loadProfileAvailableGroups(uid: string): Promise<ProfileFollowGroup[]> {
  const payload = await wbGet<ProfileAvailableGroupsPayload>(WEIBO_ENDPOINTS.profileGroups, {
    target_uid: uid,
    filterType: 'system',
    hasRecom: 'true',
  })
  return adaptProfileFollowGroups(payload.data?.lists)
}

export async function setProfileGroups(
  uid: string,
  selectedIds: string[],
  originIds: string[],
): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.profileSetGroup, {
    uids: uid,
    list_ids: selectedIds.join(','),
    origin_list_ids: originIds.join(','),
  })

  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg ?? response.message ?? '设置分组失败')
  }
}

export async function createProfileGroup(
  name: string,
  isOpen: boolean,
): Promise<ProfileFollowGroup> {
  const response = await wbPostForm<ProfileCreateGroupPayload>(WEIBO_ENDPOINTS.profileCreateGroup, {
    name,
    isOpen: String(isOpen),
  })

  if (!isWeiboMutationSuccess(response) || !response.data) {
    throw new Error(response.msg ?? response.message ?? '创建分组失败')
  }

  const group = adaptProfileFollowGroup(response.data)
  if (!group) {
    throw new Error('创建分组失败')
  }

  return group
}

export interface LoadFavoritesOptions {
  page?: number
}

export async function loadFavorites(
  uid: string,
  options: LoadFavoritesOptions = {},
): Promise<TimelinePage> {
  const page = options.page ?? 1
  const payload = await wbGet<WeiboTimelinePayload>(WEIBO_ENDPOINTS.favoritesAll, {
    uid,
    page,
    ...(page === 1 ? { with_total: 'true' } : {}),
  })
  const pageData = adaptTimelineResponse(payload, page)
  return {
    ...pageData,
    items: pageData.items.map((item) => ({ ...item, favorited: true })),
  }
}

export async function loadLikedStatuses(
  uid: string,
  options: LoadFavoritesOptions = {},
): Promise<TimelinePage> {
  const page = options.page ?? 1
  const payload = await wbGet<WeiboTimelinePayload>(WEIBO_ENDPOINTS.likedStatuses, {
    uid,
    page,
    ...(page === 1 ? { with_total: 'true' } : {}),
  })
  return adaptTimelineResponse(payload, page)
}

export async function followUser(uid: string): Promise<UserProfile> {
  const payload = await wbPostForm<ProfileInfoPayload>(WEIBO_ENDPOINTS.followCreate, {
    friend_uid: uid,
    page: 'profile',
    lpage: 'profile',
  })
  return adaptProfileInfoResponse(payload)
}

export async function unfollowUser(uid: string): Promise<UserProfile> {
  const payload = await wbPostForm<ProfileInfoPayload>(WEIBO_ENDPOINTS.followDestroy, {
    uid,
  })
  return adaptProfileInfoResponse(payload)
}

export async function setSpecialFollowUser(uid: string, special: boolean): Promise<void> {
  const endpoint = special ? WEIBO_ENDPOINTS.specialFollowAdd : WEIBO_ENDPOINTS.specialFollowDestroy
  const response = await wbPostForm<WeiboMutationResponse>(endpoint, {
    touid: uid,
  })

  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg ?? response.message ?? '设置特别关注失败')
  }
}
