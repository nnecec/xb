import type { TimelinePage } from '@/features/weibo/models/feed'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import { loadHotSearch, loadHomeTimeline, type HomeTimelineTab } from '@/features/weibo/services/weibo-repository'

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

export const hotSearchQueryOptions = {
  queryKey: ['weibo', 'hotsearch'] as const,
  queryFn: () => loadHotSearch(),
  staleTime: 5 * 60 * 1000,
}
