import type { TimelinePage } from '@/features/weibo/models/feed'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import {
  loadFavorites,
  loadHotSearch,
  loadHomeTimeline,
  loadProfilePosts,
  type HomeTimelineTab,
} from '@/features/weibo/services/weibo-repository'

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
    staleTime: 30 * 60 * 1000,
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

export const hotSearchQueryOptions = {
  queryKey: ['weibo', 'hotsearch'] as const,
  queryFn: () => loadHotSearch(),
  staleTime: 5 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
}
