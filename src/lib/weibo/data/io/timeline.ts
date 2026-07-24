import type { FollowGroups } from '@/lib/weibo/models/explore'
import { getDefaultFollowGroupForHomeTab } from '@/lib/weibo/models/explore-utils'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import {
  adaptFollowGroupsDataResponse,
  type ExploreGroupsPayload,
} from '@/lib/weibo/services/adapters/explore-groups'
import type { WeiboTimelinePayload } from '@/lib/weibo/services/adapters/timeline'
import { adaptTimelineResponse } from '@/lib/weibo/services/adapters/timeline'
import { wbGet } from '@/lib/weibo/services/client'
import type { WeiboEndpointPath } from '@/lib/weibo/services/endpoints'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'

export type HomeTimelineTab = 'for-you' | 'following' | 'special-follow' | 'friend-circle'

export interface LoadTimelineOptions {
  cursor?: string | null
  groupListId?: string | null
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
