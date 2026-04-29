import type { SubmitComposeInput } from '@/lib/weibo/models/compose'
import type { WeiboEmoticonConfig } from '@/lib/weibo/models/emoticon'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import type { NotificationsPage } from '@/lib/weibo/models/notification'
import type { UserProfile } from '@/lib/weibo/models/profile'
import type { StatusCommentsPage } from '@/lib/weibo/models/status'
import type { StatusDetail } from '@/lib/weibo/models/status'
import {
  adaptCommentsResponse,
  type WeiboCommentsPayload,
} from '@/lib/weibo/services/adapters/comments'
import {
  adaptEmoticonConfigResponse,
  type WeiboEmoticonPayload,
} from '@/lib/weibo/services/adapters/emoticon'
import {
  adaptExploreHotResponse,
  type ExploreHotPayload,
} from '@/lib/weibo/services/adapters/explore'
import {
  adaptExploreGroupsResponse,
  type ExploreGroupsPayload,
  type ExploreGroup,
} from '@/lib/weibo/services/adapters/explore-groups'
import {
  adaptHotSearchResponse,
  HotSearchPayload,
  type HotSearchPage,
} from '@/lib/weibo/services/adapters/hotsearch'
import { adaptLikes, type WeiboLikesPayload } from '@/lib/weibo/services/adapters/likes'
import {
  adaptMentionsResponse,
  type WeiboMentionsPayload,
} from '@/lib/weibo/services/adapters/mentions'
import {
  adaptProfileInfoResponse,
  mergeProfileDetail,
  type ProfileDetailPayload,
  type ProfileInfoPayload,
} from '@/lib/weibo/services/adapters/profile'
import {
  adaptSearchResponse,
  SearchPayload,
  type SearchResult,
} from '@/lib/weibo/services/adapters/search'
import {
  adaptStatusCommentsResponse,
  adaptStatusDetailResponse,
} from '@/lib/weibo/services/adapters/status'
import type { WeiboTimelinePayload } from '@/lib/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/lib/weibo/services/adapters/timeline'
import { wbGet } from '@/lib/weibo/services/client'
import { wbPostForm } from '@/lib/weibo/services/client'
import type { WeiboEndpointPath } from '@/lib/weibo/services/endpoints'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'
import type { WeiboLongTextData } from '@/lib/weibo/utils/transform'

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
  const payload = await wbGet<WeiboTimelinePayload>(path, params)
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

export async function loadMentions(cursor?: string | null): Promise<NotificationsPage> {
  const payload = await wbGet<WeiboMentionsPayload>(WEIBO_ENDPOINTS.mentions, {
    ...(cursor ? { max_id: cursor } : { since_id: '0' }),
    count: 20,
  })
  return adaptMentionsResponse(payload)
}

export async function loadComments(cursor?: string | null) {
  const payload = await wbGet<WeiboCommentsPayload>(WEIBO_ENDPOINTS.comments, {
    ...(cursor ? { max_id: cursor } : {}),
    count: 20,
  })
  return adaptCommentsResponse(payload)
}

export async function loadLikes(cursor?: string | null) {
  const payload = await wbGet<WeiboLikesPayload>(WEIBO_ENDPOINTS.likes, {
    ...(cursor ? { max_id: cursor } : {}),
    count: 20,
  })
  return adaptLikes(payload)
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
    max_id: 0,
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

interface WeiboMutationResponse {
  ok?: number
  msg?: string
  message?: string
  result?: boolean
}

function isWeiboMutationSuccess(response: WeiboMutationResponse): boolean {
  return response.ok === 1 || response.result === true
}

function buildRepostPayload(input: SubmitComposeInput): Record<string, string> {
  if (input.target.kind !== 'status') {
    throw new Error('weibo-repost-requires-status-target')
  }

  return {
    id: input.target.statusId,
    comment: input.text,
    pic_id: '',
    is_repost: '0',
    comment_ori: '0',
    is_comment: input.alsoSecondaryAction ? '1' : '0',
    visible: '0',
    share_id: '',
  }
}

export async function setStatusLike(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.setLike, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-like-failed')
  }
}

export async function cancelStatusLike(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelLike, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-unlike-failed')
  }
}

export async function setCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.setCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-comment-like-failed')
  }
}

export async function cancelCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  console.log('[cancelCommentLike] response:', JSON.stringify(response))
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-comment-unlike-failed')
  }
}

export async function deleteWeiboStatus(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.statusDestroy, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-delete-status-failed')
  }
}

export async function deleteWeiboComment(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyComment, {
    cid: commentId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-delete-comment-failed')
  }
}

export async function createFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.createFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-favorite-failed')
  }
}

export async function destroyFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || 'weibo-unfavorite-failed')
  }
}

function buildCommentPayload(input: SubmitComposeInput): Record<string, string> {
  const payload: Record<string, string> = {
    id: input.target.statusId,
    comment: input.text,
    pic_id: '',
    is_repost: input.alsoSecondaryAction ? '1' : '0',
    comment_ori: '0',
    is_comment: '0',
  }

  if (input.target.kind === 'comment') {
    payload.cid = input.target.targetCommentId
  }

  return payload
}

export async function submitComposeAction(input: SubmitComposeInput): Promise<void> {
  if (input.target.mode === 'repost') {
    const response = await wbPostForm<WeiboMutationResponse>(
      WEIBO_ENDPOINTS.normalRepost,
      buildRepostPayload(input),
    )
    if (!isWeiboMutationSuccess(response)) {
      throw new Error(response.msg || response.message || '发送微博失败')
    }

    return
  }

  const endpoint =
    input.target.kind === 'comment' ? WEIBO_ENDPOINTS.commentReply : WEIBO_ENDPOINTS.commentCreate

  const response = await wbPostForm<WeiboMutationResponse>(endpoint, buildCommentPayload(input))

  if (response.ok !== 1) {
    throw new Error(response.msg || response.message || '发送微博失败')
  }
}

export async function loadHotSearch(): Promise<HotSearchPage> {
  const payload = await wbGet<HotSearchPayload>(WEIBO_ENDPOINTS.searchBand, {
    last_tab: 'hot',
  })
  return adaptHotSearchResponse(payload)
}

export type ExploreTab = 'hot' | 'local' | 'realtime' | 'rank'

export interface LoadExploreHotOptions {
  cursor?: string | null
  groupId?: string
  containerid?: string
}

export async function loadExploreHot(options: LoadExploreHotOptions = {}): Promise<TimelinePage> {
  const isFirstPage = !options.cursor
  const cursorNum = options.cursor ? Number(options.cursor) : 0
  const nextCursor = isFirstPage ? 0 : cursorNum + 1

  const payload = await wbGet<ExploreHotPayload>(WEIBO_ENDPOINTS.exploreHot, {
    refresh: isFirstPage ? 0 : 2,
    group_id: options.groupId ?? '102803',
    containerid: options.containerid ?? '102803',
    extparam: 'discover|new_feed',
    max_id: isFirstPage ? 0 : nextCursor,
    count: 10,
  })
  return adaptExploreHotResponse(payload)
}

export async function loadExploreGroups(): Promise<ExploreGroup[]> {
  const payload = await wbGet<ExploreGroupsPayload>(WEIBO_ENDPOINTS.exploreGroups, {
    is_new_segment: 1,
    fetch_hot: 1,
  })
  return adaptExploreGroupsResponse(payload)
}

export async function loadSearch(query: string): Promise<SearchResult> {
  const payload = await wbGet<SearchPayload>(WEIBO_ENDPOINTS.searchSide, {
    q: query,
  })
  return adaptSearchResponse(payload)
}
