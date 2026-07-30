import type { HotSearchType } from '@/lib/app-settings'
import type { ExploreGroup } from '@/lib/weibo/models/explore'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import type { SuperTopicPage } from '@/lib/weibo/models/super-topic'
import {
  adaptExploreHotResponse,
  type ExploreHotPayload,
} from '@/lib/weibo/services/adapters/explore'
import {
  adaptExploreGroupsResponse,
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
import {
  adaptSearchResponse,
  type SearchPayload,
  type SearchResult,
} from '@/lib/weibo/services/adapters/search'
import {
  adaptSuperTopicResponse,
  type SuperTopicPayload,
} from '@/lib/weibo/services/adapters/super-topic'
import { wbGet } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'

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
