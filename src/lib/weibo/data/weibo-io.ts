/**
 * Private Weibo IO implementation (load* / mutations).
 * Not a public seam — import from `@/lib/weibo/data/weibo-data` in production code.
 * Tests may mock this module so queryFn closures and re-exports both see fakes.
 */

import type { HotSearchType } from '@/lib/app-settings'
import type { SubmitComposeInput } from '@/lib/weibo/models/compose'
import type { WeiboEmoticonConfig } from '@/lib/weibo/models/emoticon'
import type { ExploreGroup, FollowGroups } from '@/lib/weibo/models/explore'
import { getDefaultFollowGroupForHomeTab } from '@/lib/weibo/models/explore-utils'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import type { NotificationsPage } from '@/lib/weibo/models/notification'
import type { ProfileFollowGroup, UserProfile } from '@/lib/weibo/models/profile'
import type { CommentItem, StatusCommentsPage } from '@/lib/weibo/models/status'
import type { StatusDetail } from '@/lib/weibo/models/status'
import type { SuperTopicPage } from '@/lib/weibo/models/super-topic'
import type { ProfileSearchFilters } from '@/lib/weibo/route/profile-search-params'
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
  adaptFollowGroupsDataResponse,
  type ExploreGroupsPayload,
} from '@/lib/weibo/services/adapters/explore-groups'
import {
  adaptEntertainmentBandResponse,
  adaptHotSearchResponse,
  adaptLifeBandResponse,
  adaptMineBandResponse,
  adaptSocialBandResponse,
  type EntertainmentBandPayload,
  type HotSearchPage,
  type HotSearchPayload,
  type LifeBandPayload,
  type MineBandPayload,
  type SocialBandPayload,
} from '@/lib/weibo/services/adapters/hotsearch'
import { adaptLikes, type WeiboLikesPayload } from '@/lib/weibo/services/adapters/likes'
import {
  adaptMweiboTopicResponse,
  type MweiboTopicPayload,
} from '@/lib/weibo/services/adapters/m-weibo-topic'
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
import {
  adaptSuperTopicResponse,
  type SuperTopicPayload,
} from '@/lib/weibo/services/adapters/super-topic'
import type { WeiboTimelinePayload } from '@/lib/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/lib/weibo/services/adapters/timeline'
import { wbGet } from '@/lib/weibo/services/client'
import { wbPostForm } from '@/lib/weibo/services/client'
import type { WeiboEndpointPath } from '@/lib/weibo/services/endpoints'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'
import { buildTopicSearchUrl, mweiboFetch } from '@/lib/weibo/services/m-weibo-client'
import type { WeiboLongTextData } from '@/lib/weibo/utils/transform'

export type HomeTimelineTab = 'for-you' | 'following' | 'special-follow' | 'friend-circle'
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

export interface LoadTimelineOptions {
  cursor?: string | null
  groupListId?: string | null
}

function getTimelinePath(tab: HomeTimelineTab): WeiboEndpointPath {
  return tab === 'following' ? WEIBO_ENDPOINTS.following : WEIBO_ENDPOINTS.forYou
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

  // Special follow (特别关注) and friend circle (朋友圈) use the groupstimeline endpoint
  if (tab === 'special-follow') {
    const listId = options.groupListId ?? (await loadHomeTimelineDefaultGroupId(tab))
    return loadTimeline(WEIBO_ENDPOINTS.groupTimeline, {
      list_id: listId,
      refresh: 4,
      fast_refresh: 1,
      count: 25,
      ...(isFirstPage ? {} : { max_id: options.cursor }),
    })
  }

  if (tab === 'friend-circle') {
    const listId = options.groupListId ?? (await loadHomeTimelineDefaultGroupId(tab))
    return loadTimeline(WEIBO_ENDPOINTS.groupTimeline, {
      list_id: listId,
      refresh: 4,
      fast_refresh: 1,
      count: 25,
      ...(isFirstPage ? {} : { max_id: options.cursor }),
    })
  }

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

export async function loadFollowGroups(): Promise<FollowGroups> {
  const payload = await wbGet<ExploreGroupsPayload>(WEIBO_ENDPOINTS.exploreGroups, {
    is_new_segment: 1,
    fetch_hot: 1,
  })
  return adaptFollowGroupsDataResponse(payload)
}

async function loadHomeTimelineDefaultGroupId(
  tab: Extract<HomeTimelineTab, 'special-follow' | 'friend-circle'>,
): Promise<string> {
  const groups = await loadFollowGroups()
  const group = getDefaultFollowGroupForHomeTab(groups.defaultGroups, tab)

  if (!group) {
    throw new Error(
      tab === 'special-follow' ? '未找到默认分组「特别关注」' : '未找到默认分组「互相关注」',
    )
  }

  return group.gid
}

export async function loadGroupTimeline(
  listId: string,
  options: LoadTimelineOptions = {},
): Promise<TimelinePage> {
  const isFirstPage = !options.cursor
  return loadTimeline(WEIBO_ENDPOINTS.groupTimeline, {
    list_id: listId,
    refresh: 4,
    fast_refresh: 1,
    count: 25,
    ...(isFirstPage ? {} : { max_id: options.cursor }),
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
  return adaptTimelineResponse(payload, page)
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

interface WeiboMutationResponse {
  ok?: number
  msg?: string
  message?: string
  result?: boolean
}

function isWeiboMutationSuccess(response: WeiboMutationResponse): boolean {
  return response.ok === 1 || response.result === true
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
    throw new Error(response.msg || response.message || '点赞失败')
  }
}

export async function cancelStatusLike(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelLike, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消点赞失败')
  }
}

export async function setCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.setCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '评论点赞失败')
  }
}

export async function cancelCommentLike(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.cancelCommentLike, {
    object_id: commentId,
    object_type: 'comment',
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消评论点赞失败')
  }
}

export async function deleteWeiboStatus(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.statusDestroy, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '删除微博失败')
  }
}

export async function deleteWeiboComment(commentId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyComment, {
    cid: commentId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '删除评论失败')
  }
}

export async function createFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.createFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '收藏失败')
  }
}

export async function destroyFavorite(statusId: string): Promise<void> {
  const response = await wbPostForm<WeiboMutationResponse>(WEIBO_ENDPOINTS.destroyFavorites, {
    id: statusId,
  })
  if (!isWeiboMutationSuccess(response)) {
    throw new Error(response.msg || response.message || '取消收藏失败')
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
    fp: '',
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

interface PublishStatusResponse {
  ok?: number
  msg?: string
  message?: string
  id?: string
  mid?: string
}

export async function publishWeiboStatus(content: string): Promise<void> {
  const response = await wbPostForm<PublishStatusResponse>(WEIBO_ENDPOINTS.statusUpdate, {
    content,
    visible: '0',
    share_id: '',
    vote: '',
    media: '',
    fp: '',
  })

  if (response.ok !== 1) {
    throw new Error(response.msg || response.message || '发布失败，请稍后再试')
  }
}

export async function loadHotSearchByType(type: HotSearchType = 'hot'): Promise<HotSearchPage> {
  switch (type) {
    case 'mine': {
      const payload = await wbGet<MineBandPayload>(WEIBO_ENDPOINTS.mineBand)
      const items = adaptMineBandResponse(payload, type)
      return { items }
    }
    case 'entertainment': {
      const payload = await wbGet<EntertainmentBandPayload>(WEIBO_ENDPOINTS.entertainmentBand)
      const items = adaptEntertainmentBandResponse(payload, type)
      return { items }
    }
    case 'life': {
      const payload = await wbGet<LifeBandPayload>(WEIBO_ENDPOINTS.lifeBand)
      const items = adaptLifeBandResponse(payload, type)
      return { items }
    }
    case 'social': {
      const payload = await wbGet<SocialBandPayload>(WEIBO_ENDPOINTS.socialBand)
      const items = adaptSocialBandResponse(payload, type)
      return { items }
    }
    default:
      return adaptHotSearchResponse(
        await wbGet<HotSearchPayload>(WEIBO_ENDPOINTS.searchBand, { last_tab: 'hot' }),
        type,
      )
  }
}

export async function loadFollowedSuperTopics(): Promise<SuperTopicPage> {
  const payload = await wbGet<SuperTopicPayload>(WEIBO_ENDPOINTS.profileTopicContent, {
    tabid: '231093_-_chaohua',
  })

  return adaptSuperTopicResponse(payload)
}

export interface LoadExploreHotOptions {
  cursor?: string | null
  groupId?: string
  containerid?: string
}

export async function loadExploreHot(options: LoadExploreHotOptions = {}): Promise<TimelinePage> {
  const isFirstPage = !options.cursor

  const payload = await wbGet<ExploreHotPayload>(WEIBO_ENDPOINTS.exploreHot, {
    refresh: isFirstPage ? 0 : 2,
    group_id: options.groupId ?? '102803',
    containerid: options.containerid ?? '102803',
    extparam: 'discover|new_feed',
    max_id: isFirstPage ? 0 : options.cursor,
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

// ─── Unread Notifications ───

export interface UnreadCounts {
  mentions: number
  comments: number
  likes: number
  dm: number
}

export async function checkUnreadNotifications(): Promise<UnreadCounts> {
  try {
    const payload = await mweiboFetch<{
      ok: number
      data?: {
        mention_cmt?: number
        mention_status?: number
        cmt?: number
        attitude?: number
        dm?: number
        group?: number
        msgbox?: number
        notice?: number
      }
    }>(WEIBO_ENDPOINTS.mweiboRemind)
    const data = payload?.data
    return {
      mentions: (data?.mention_cmt ?? 0) + (data?.mention_status ?? 0),
      comments: data?.cmt ?? 0,
      likes: data?.attitude ?? 0,
      dm: (data?.dm ?? 0) + (data?.group ?? 0) + (data?.msgbox ?? 0) + (data?.notice ?? 0),
    }
  } catch {
    return { mentions: 0, comments: 0, likes: 0, dm: 0 }
  }
}

// ─── Friends / Followers & Following ───

import type { RelationPage, WeiboFriendsPayload } from '@/lib/weibo/models/user-relation'
import { adaptFriendsResponse } from '@/lib/weibo/services/adapters/friends'

interface LoadFriendsOptions {
  page?: number
  relate?: 'fans'
  count?: number
}

export async function loadFriends(
  uid: string,
  options: LoadFriendsOptions = {},
): Promise<RelationPage> {
  const { page = 1, relate, count = 20 } = options

  const params: Record<string, string | number> = {
    uid,
    page,
  }

  if (relate === 'fans') {
    params.relate = 'fans'
    params.count = count
    params.type = 'fans'
    params.fansSortType = 'followTime'
  }

  const payload = await wbGet<WeiboFriendsPayload>(WEIBO_ENDPOINTS.friends, params)
  return adaptFriendsResponse(payload)
}

export async function loadTopicSearch(
  topic: string,
  page: number,
  channelType?: string,
): Promise<TimelinePage> {
  const url = buildTopicSearchUrl(topic, page, channelType)
  const payload = await mweiboFetch<MweiboTopicPayload>(url)
  return adaptMweiboTopicResponse(payload, page)
}
