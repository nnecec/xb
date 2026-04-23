import type { TimelinePage } from '@/lib/weibo/models/feed'
import type { NotificationsPage } from '@/lib/weibo/models/notification'
import type { NotificationTab } from '@/lib/weibo/route/page-descriptor'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'
import {
  loadComments,
  loadFavorites,
  loadHotSearch,
  loadHomeTimeline,
  loadMentions,
  loadProfilePosts,
  loadSearch,
  type HomeTimelineTab,
} from '@/lib/weibo/services/weibo-repository'

export function flattenInfiniteItems<Item>(pages: Array<{ items: Item[] }> | undefined): Item[] {
  return pages?.flatMap((page) => page.items) ?? []
}

export function profileLookupFromPage(page: WeiboPageDescriptor) {
  if (page.kind !== 'profile') {
    return null
  }

  return page.profileSource === 'u'
    ? ({ uid: page.profileId } as const)
    : ({ screenName: page.profileId } as const)
}

export function homeTimelineInfiniteOptions(activeTimelineTab: HomeTimelineTab) {
  return {
    queryKey: ['weibo', 'timeline', activeTimelineTab] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      loadHomeTimeline(activeTimelineTab, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  }
}

export function profilePostsInfiniteOptions(profileId: string) {
  return {
    queryKey: ['weibo', 'profile', 'posts', profileId] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      loadProfilePosts(profileId, pageParam ? Number(pageParam) : 1),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
  }
}

export function favoritesInfiniteOptions(uid: string) {
  return {
    queryKey: ['weibo', 'favorites', uid] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      loadFavorites(uid, { page: pageParam ? Number(pageParam) : 1 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
  }
}

export function notificationsInfiniteOptions(_tab: NotificationTab) {
  return {
    queryKey: ['weibo', 'notifications', _tab] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) => {
      if (_tab === 'mentions') {
        return loadMentions(pageParam)
      }
      if (_tab === 'comments') {
        return loadComments(pageParam)
      }
      return Promise.resolve({ items: [], nextCursor: null } as NotificationsPage)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: NotificationsPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
  }
}

export const hotSearchQueryOptions = {
  queryKey: ['weibo', 'hotsearch'] as const,
  queryFn: () => loadHotSearch(),
  staleTime: 5 * 60 * 1000,
  refetchInterval: 10 * 60 * 1000,
}

export function searchQueryOptions(query: string) {
  return {
    queryKey: ['weibo', 'search', query] as const,
    queryFn: () => loadSearch(query),
    enabled: query.trim().length > 0,
    staleTime: 0,
  }
}
