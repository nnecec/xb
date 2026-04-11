import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import type { CommentItem, StatusCommentsPage } from '@/features/weibo/models/status'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import {
  loadHomeTimeline,
  loadProfileHoverCard,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
  type HomeTimelineTab,
} from '@/features/weibo/services/weibo-repository'

function flattenInfiniteItems<Item>(pages: Array<{ items: Item[] }> | undefined): Item[] {
  return pages?.flatMap((page) => page.items) ?? []
}

function getProfileLookup(page: WeiboPageDescriptor) {
  if (page.kind !== 'profile') {
    return null
  }

  return page.profileSource === 'u'
    ? ({ uid: page.profileId } as const)
    : ({ screenName: page.profileId } as const)
}

function getStatusId(page: WeiboPageDescriptor) {
  return page.kind === 'status' ? page.statusId : null
}

export function useHomeTimelineData({
  activeTimelineTab,
  isEnabled,
}: {
  activeTimelineTab: HomeTimelineTab
  isEnabled: boolean
}) {
  const timelineQuery = useInfiniteQuery({
    queryKey: ['weibo', 'timeline', activeTimelineTab],
    queryFn: ({ pageParam }) => loadHomeTimeline(activeTimelineTab, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
    enabled: isEnabled,
  })

  return {
    timelineQuery,
    items: flattenInfiniteItems<FeedItem>(timelineQuery.data?.pages as TimelinePage[] | undefined),
  }
}

export function useProfilePageData({
  page,
  isEnabled,
}: {
  page: WeiboPageDescriptor
  isEnabled: boolean
}) {
  const profileLookup = getProfileLookup(page)

  const profileInfoQuery = useQuery({
    queryKey: [
      'weibo',
      'profile',
      'info',
      profileLookup ? ('uid' in profileLookup ? 'u' : 'n') : null,
      profileLookup
        ? 'uid' in profileLookup
          ? profileLookup.uid
          : profileLookup.screenName
        : null,
    ],
    queryFn: profileLookup ? () => loadProfileHoverCard(profileLookup) : skipToken,
    enabled: isEnabled && profileLookup !== null,
  })

  const profilePostsQuery = useQuery({
    queryKey: ['weibo', 'profile', 'posts', profileInfoQuery.data?.id ?? null],
    queryFn: () => loadProfilePosts(profileInfoQuery.data!.id),
    enabled: isEnabled && Boolean(profileInfoQuery.data?.id),
  })

  const errorMessage =
    (profileInfoQuery.error as Error | null)?.message ??
    (profilePostsQuery.error as Error | null)?.message ??
    null

  return {
    profileInfoQuery,
    profilePostsQuery,
    isLoading: profileInfoQuery.isLoading || profilePostsQuery.isLoading,
    errorMessage,
    viewingProfileUserId: profileLookup ? (profileInfoQuery.data?.id ?? null) : null,
  }
}

export function useStatusPageData({
  page,
  isEnabled,
  filterParam,
}: {
  page: WeiboPageDescriptor
  isEnabled: boolean
  filterParam?: string
}) {
  const urlStatusId = getStatusId(page)
  const authorId = page.kind === 'status' ? page.authorId : null

  const statusDetailQuery = useQuery({
    queryKey: ['weibo', 'status', urlStatusId],
    queryFn: urlStatusId ? () => loadStatusDetail(urlStatusId) : skipToken,
    enabled: isEnabled && urlStatusId !== null,
  })

  const commentsStatusId = statusDetailQuery.data?.status.id ?? null

  const statusCommentsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'status-comments', commentsStatusId, filterParam],
    queryFn:
      commentsStatusId && authorId
        ? ({ pageParam }) => loadStatusComments(commentsStatusId, authorId, pageParam, filterParam)
        : skipToken,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled && commentsStatusId !== null && authorId !== null,
  })

  return {
    statusDetailQuery,
    statusCommentsQuery,
    comments: flattenInfiniteItems<CommentItem>(
      statusCommentsQuery.data?.pages as StatusCommentsPage[] | undefined,
    ),
    filterGroup: statusCommentsQuery.data?.pages[0]?.filterGroup,
  }
}

export type StatusDetailNavigationItem = Pick<FeedItem, 'author' | 'id' | 'mblogId'>
