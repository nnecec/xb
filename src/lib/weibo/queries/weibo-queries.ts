import type { HotSearchType } from '@/lib/app-settings'
import type { FeedAuthor, TimelinePage, TopicChannel } from '@/lib/weibo/models/feed'
import type { NotificationsPage } from '@/lib/weibo/models/notification'
import type { NotificationTab } from '@/lib/weibo/route/page-descriptor'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'
import type { ExploreGroup } from '@/lib/weibo/services/adapters/explore-groups'
import type { UnreadCounts } from '@/lib/weibo/services/weibo-repository'
import { checkUnreadNotifications } from '@/lib/weibo/services/weibo-repository'
import {
  loadComments,
  loadExploreGroups,
  loadExploreHot,
  loadFavorites,
  loadFollowGroups,
  loadGroupTimeline,
  loadHotSearchByType,
  loadHomeTimeline,
  loadMentions,
  loadProfilePosts,
  loadSearch,
  loadTopicSearch,
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

/** Result of checking for new posts on the "following" timeline. */
export interface FollowingNewPostsCheck {
  /** Authors of the new posts (deduplicated, up to 5). */
  authors: FeedAuthor[]
  /** Total count of new posts found. */
  count: number
}

export function followingNewPostsCheckOptions(
  seenFirstItemId: string | null,
  groupListId?: string | null,
) {
  return {
    queryKey: ['weibo', 'timeline', 'following', groupListId ?? 'default', 'new-check'] as const,
    queryFn: async () => {
      const page = groupListId
        ? await loadGroupTimeline(groupListId, { cursor: null })
        : await loadHomeTimeline('following')
      if (page.items.length === 0) {
        return null as FollowingNewPostsCheck | null
      }

      const newItems: typeof page.items = []
      for (const item of page.items) {
        if (item.id === seenFirstItemId) break
        newItems.push(item)
      }

      if (newItems.length === 0) {
        return null as FollowingNewPostsCheck | null
      }

      const seenAuthorIds = new Set<string>()
      const authors: FeedAuthor[] = []
      for (const item of newItems) {
        if (seenAuthorIds.has(item.author.id)) continue
        seenAuthorIds.add(item.author.id)
        authors.push(item.author)
        if (authors.length >= 5) break
      }

      return { authors, count: newItems.length } as FollowingNewPostsCheck
    },
    staleTime: 0,
    refetchInterval: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  }
}

export function homeTimelineInfiniteOptions(
  activeTimelineTab: HomeTimelineTab,
  groupListId?: string | null,
) {
  const useGroupTimeline = activeTimelineTab === 'following' && groupListId
  return {
    queryKey: ['weibo', 'timeline', activeTimelineTab, groupListId ?? 'default'] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      useGroupTimeline
        ? loadGroupTimeline(groupListId!, { cursor: pageParam })
        : loadHomeTimeline(activeTimelineTab, { cursor: pageParam, existingCount: 0 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    gcTime: Infinity,
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

export function hotSearchQueryOptions(type: HotSearchType = 'hot') {
  return {
    queryKey: ['weibo', 'hotsearch', type],
    queryFn: () => loadHotSearchByType(type),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  }
}

export function searchQueryOptions(query: string) {
  return {
    queryKey: ['weibo', 'search', query] as const,
    queryFn: () => loadSearch(query),
    enabled: query.trim().length > 0,
    staleTime: 0,
  }
}

export function exploreTimelineInfiniteOptions(group: ExploreGroup) {
  return {
    queryKey: ['weibo', 'explore', group.gid] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      loadExploreHot({ cursor: pageParam, groupId: group.gid, containerid: group.containerid }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  }
}

import type { RelationPage } from '@/lib/weibo/models/user-relation'
import { loadFriends } from '@/lib/weibo/services/weibo-repository'

export function friendsInfiniteOptions(uid: string, tab: 'following' | 'fans') {
  return {
    queryKey: ['weibo', 'friends', tab, uid] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      loadFriends(uid, {
        page: pageParam,
        relate: tab === 'fans' ? 'fans' : undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: RelationPage, _allPages: RelationPage[], lastPageParam: number) =>
      lastPage.nextPage != null ? lastPageParam + 1 : undefined,
    staleTime: 30 * 1000,
  }
}

export const exploreGroupsQueryOptions = {
  queryKey: ['weibo', 'explore', 'groups'] as const,
  queryFn: () => loadExploreGroups(),
  staleTime: 60 * 60 * 1000,
}

export const followGroupsQueryOptions = {
  queryKey: ['weibo', 'follow-groups'] as const,
  queryFn: () => loadFollowGroups(),
  staleTime: 60 * 60 * 1000,
}

export function topicSearchInfiniteOptions(topic: string, channelType?: string) {
  return {
    queryKey: ['weibo', 'topic', topic, channelType ?? '1'] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      loadTopicSearch(topic, pageParam, channelType),
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage: TimelinePage, allPages: TimelinePage[]) =>
      lastPage.items.length > 0 ? allPages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
  }
}

/** Extract channels from the first page of topic search results. */
export function extractTopicChannels(pages: TimelinePage[] | undefined): TopicChannel[] {
  return pages?.[0]?.channels ?? []
}

/** Extract head data from the first page of topic search results. */
export function extractTopicHeadData(pages: TimelinePage[] | undefined) {
  return pages?.[0]?.headData ?? null
}

// ─── Unread Notifications ───

/** Polls unread notification / DM counts from m.weibo.cn. */
export const unreadNotificationsQueryOptions = {
  queryKey: ['weibo', 'unread'] as const,
  queryFn: (): Promise<UnreadCounts> => checkUnreadNotifications(),
  staleTime: 30 * 1000,
  refetchInterval: 60 * 1000,
  gcTime: 5 * 60 * 1000,
}

/** Whether the notification tab should show a badge. */
export function hasNotificationBadge(counts: UnreadCounts): boolean {
  return counts.mentions + counts.comments + counts.likes > 0
}

/** Whether the DM tab should show a badge. */
export function hasDmBadge(counts: UnreadCounts): boolean {
  return counts.dm > 0
}
