import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'
import type { CommentItem } from '@/lib/weibo/models/status'
import {
  optimisticallyRemoveStatusFromFavorites,
  optimisticallyIncrementStatusComments,
  optimisticallyToggleCommentLike,
  optimisticallyToggleStatusFavorite,
  optimisticallyToggleStatusLike,
  restoreStatusCacheMutation,
  shouldCancelWeiboQueryForStatusMutation,
} from '@/lib/weibo/queries/status-cache'

function createFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'status-1',
    mblogId: 'mblog-1',
    isLongText: false,
    liked: false,
    favorited: false,
    author: { id: 'user-1', name: 'Alice', avatarUrl: null },
    text: 'hello',
    createdAt: '',
    createdAtLabel: '',
    stats: { likes: 1, comments: 2, reposts: 3 },
    images: [],
    media: null,
    ...overrides,
  }
}

function createCommentItem(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: 'comment-1',
    text: 'comment',
    createdAtLabel: '',
    author: { id: 'user-1', name: 'Alice', avatarUrl: null },
    likeCount: 1,
    liked: false,
    images: [],
    replyComment: null,
    comments: [],
    ...overrides,
  }
}

describe('status-cache', () => {
  it('toggles status like in feed pages, retweeted status, and status detail caches', async () => {
    const queryClient = new QueryClient()
    const root = createFeedItem({
      id: 'root',
      liked: false,
      stats: { likes: 1, comments: 0, reposts: 0 },
    })
    const retweeted = createFeedItem({
      id: 'retweeted',
      liked: false,
      stats: { likes: 5, comments: 0, reposts: 0 },
    })
    const wrapper = createFeedItem({
      id: 'wrapper',
      retweetedStatus: retweeted,
    })

    queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [root, wrapper] }] })
    queryClient.setQueryData(['weibo', 'status', 'retweeted'], { status: retweeted })

    await optimisticallyToggleStatusLike(queryClient, retweeted)

    const feed = queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>([
      'weibo',
      'timeline',
    ])
    expect(feed?.pages[0]?.items[1]?.retweetedStatus?.liked).toBe(true)
    expect(feed?.pages[0]?.items[1]?.retweetedStatus?.stats.likes).toBe(6)
    expect(
      queryClient.getQueryData<{ status: FeedItem }>(['weibo', 'status', 'retweeted'])?.status
        .liked,
    ).toBe(true)
  })

  it('toggles status favorite and can restore the previous snapshot', async () => {
    const queryClient = new QueryClient()
    const item = createFeedItem({ id: 'status-1', favorited: false })
    queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [item] }] })

    const context = await optimisticallyToggleStatusFavorite(queryClient, item)
    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
        ?.pages[0]?.items[0]?.favorited,
    ).toBe(true)

    restoreStatusCacheMutation(queryClient, context)
    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
        ?.pages[0]?.items[0]?.favorited,
    ).toBe(false)
  })

  it('does not roll back later optimistic changes when an earlier mutation fails', async () => {
    const queryClient = new QueryClient()
    const item = createFeedItem({
      id: 'status-1',
      favorited: false,
      liked: false,
      stats: { likes: 1, comments: 0, reposts: 0 },
    })
    queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [item] }] })

    const likeContext = await optimisticallyToggleStatusLike(queryClient, item)
    const likedItem = queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>([
      'weibo',
      'timeline',
    ])?.pages[0]?.items[0]

    const favoriteContext = await optimisticallyToggleStatusFavorite(queryClient, likedItem ?? item)
    expect(favoriteContext).toBeDefined()

    restoreStatusCacheMutation(queryClient, likeContext)

    const current = queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>([
      'weibo',
      'timeline',
    ])?.pages[0]?.items[0]
    expect(current?.liked).toBe(false)
    expect(current?.stats.likes).toBe(1)
    expect(current?.favorited).toBe(true)
  })

  it('removes unfavorited statuses from favorites pages and can restore the previous snapshot', async () => {
    const queryClient = new QueryClient()
    const item = createFeedItem({ id: 'status-1', favorited: true })
    const other = createFeedItem({ id: 'status-2', favorited: true })
    queryClient.setQueryData(['weibo', 'favorites', 'user-1'], {
      pages: [{ items: [item, other] }],
    })
    queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [item] }] })

    const context = await optimisticallyToggleStatusFavorite(queryClient, item)

    expect(
      queryClient
        .getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'favorites', 'user-1'])
        ?.pages[0]?.items.map((cachedItem) => cachedItem.id),
    ).toEqual(['status-2'])
    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
        ?.pages[0]?.items[0]?.favorited,
    ).toBe(false)

    restoreStatusCacheMutation(queryClient, context)
    expect(
      queryClient
        .getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'favorites', 'user-1'])
        ?.pages[0]?.items.map((cachedItem) => cachedItem.id),
    ).toEqual(['status-1', 'status-2'])
  })

  it('removes deleted statuses from favorites pages and can restore the previous snapshot', async () => {
    const queryClient = new QueryClient()
    const item = createFeedItem({ id: 'status-1', deleted: true, favorited: true })
    queryClient.setQueryData(['weibo', 'favorites', 'user-1'], {
      pages: [{ items: [item] }],
    })

    const context = await optimisticallyRemoveStatusFromFavorites(queryClient, item.id)

    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>([
        'weibo',
        'favorites',
        'user-1',
      ])?.pages[0]?.items,
    ).toEqual([])

    restoreStatusCacheMutation(queryClient, context)
    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>([
        'weibo',
        'favorites',
        'user-1',
      ])?.pages[0]?.items,
    ).toEqual([item])
  })

  it('increments status comments in feed pages and status detail caches', async () => {
    const queryClient = new QueryClient()
    const item = createFeedItem({ id: 'status-1', stats: { likes: 0, comments: 2, reposts: 0 } })
    queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [item] }] })
    queryClient.setQueryData(['weibo', 'status', 'status-1'], { status: item })

    await optimisticallyIncrementStatusComments(queryClient, 'status-1')

    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
        ?.pages[0]?.items[0]?.stats.comments,
    ).toBe(3)
    expect(
      queryClient.getQueryData<{ status: FeedItem }>(['weibo', 'status', 'status-1'])?.status.stats
        .comments,
    ).toBe(3)
  })

  it('toggles nested comment like in comment pages', async () => {
    const queryClient = new QueryClient()
    const child = createCommentItem({ id: 'child', likeCount: 4, liked: false })
    const parent = createCommentItem({ id: 'parent', comments: [child] })
    queryClient.setQueryData(['weibo', 'status-comments', 'status-1'], {
      pages: [{ items: [parent] }],
    })

    await optimisticallyToggleCommentLike(queryClient, child)

    const comments = queryClient.getQueryData<{ pages: Array<{ items: CommentItem[] }> }>([
      'weibo',
      'status-comments',
      'status-1',
    ])
    expect(comments?.pages[0]?.items[0]?.comments[0]?.liked).toBe(true)
    expect(comments?.pages[0]?.items[0]?.comments[0]?.likeCount).toBe(5)
  })

  it('toggles comment like in feed and nested comment item caches', async () => {
    const queryClient = new QueryClient()
    const child = createCommentItem({ id: 'child', likeCount: 4, liked: false })
    const parent = createCommentItem({ id: 'parent', comments: [child] })
    queryClient.setQueryData(['weibo', 'feed-comments', 'status-1'], {
      items: [parent],
      totalNumber: 1,
    })
    queryClient.setQueryData(['weibo', 'nested-comments', 'parent'], {
      items: [child],
      nextCursor: null,
    })

    await optimisticallyToggleCommentLike(queryClient, child)

    const feedComments = queryClient.getQueryData<{
      items: CommentItem[]
      totalNumber: number
    }>(['weibo', 'feed-comments', 'status-1'])
    const nestedComments = queryClient.getQueryData<{
      items: CommentItem[]
      nextCursor: string | null
    }>(['weibo', 'nested-comments', 'parent'])
    expect(feedComments?.items[0]?.comments[0]?.liked).toBe(true)
    expect(feedComments?.items[0]?.comments[0]?.likeCount).toBe(5)
    expect(nestedComments?.items[0]?.liked).toBe(true)
    expect(nestedComments?.items[0]?.likeCount).toBe(5)
  })
})

describe('shouldCancelWeiboQueryForStatusMutation', () => {
  it('returns false for non-weibo and status-unrelated weibo keys', () => {
    expect(shouldCancelWeiboQueryForStatusMutation(['other', 'timeline'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'unread'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'hotsearch'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'explore', 'groups'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'follow-groups'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'friends'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'search'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'super-topics'])).toBe(false)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'longtext', 'id'])).toBe(false)
  })

  it('returns true for status-relevant weibo query keys', () => {
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'timeline'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'timeline', 'new-check'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'explore', 'gid-1'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'profile', 'uid'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'favorites'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'liked-statuses'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'status', 'id'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'status-comments', 'id'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'nested-comments', 'id'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'feed-comments', 'id'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'topic', 'slug'])).toBe(true)
    expect(shouldCancelWeiboQueryForStatusMutation(['weibo', 'notifications'])).toBe(true)
  })
})
