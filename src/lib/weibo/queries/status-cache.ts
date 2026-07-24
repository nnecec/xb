import type { QueryClient, QueryKey } from '@tanstack/react-query'

import type { FeedItem } from '@/lib/weibo/models/feed'
import type { CommentItem } from '@/lib/weibo/models/status'

export interface StatusCacheMutationContext {
  rollbacks: Array<(queryClient: QueryClient) => void>
}

type InfinitePagesData<PageItem> = {
  pages: Array<{ items: PageItem[] }>
}

type ItemsData<Item> = {
  items: Item[]
}

function createStatusCacheMutationContext(): StatusCacheMutationContext {
  return {
    rollbacks: [],
  }
}

export function restoreStatusCacheMutation(
  queryClient: QueryClient,
  context: StatusCacheMutationContext | undefined,
) {
  if (!context?.rollbacks) {
    return
  }

  for (const rollback of context.rollbacks.toReversed()) {
    rollback(queryClient)
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasInfinitePages<Item>(value: unknown): value is InfinitePagesData<Item> {
  return (
    isObject(value) &&
    Array.isArray(value.pages) &&
    value.pages.every((page) => isObject(page) && Array.isArray(page.items))
  )
}

function hasItems<Item>(value: unknown): value is ItemsData<Item> {
  return isObject(value) && Array.isArray(value.items)
}

function isFeedItem(value: unknown): value is FeedItem {
  return isObject(value) && isObject(value.stats) && isObject(value.author)
}

function isCommentItem(value: unknown): value is CommentItem {
  return isObject(value) && typeof value.likeCount === 'number' && isObject(value.author)
}

function updateFeedItemById(
  item: FeedItem,
  statusId: string,
  update: (item: FeedItem) => FeedItem,
): { item: FeedItem; changed: boolean } {
  if (item.id === statusId) {
    return { item: update(item), changed: true }
  }

  if (item.retweetedStatus?.id === statusId) {
    return {
      item: {
        ...item,
        retweetedStatus: update(item.retweetedStatus as FeedItem),
      },
      changed: true,
    }
  }

  return { item, changed: false }
}

function updateStatusInData(
  data: unknown,
  statusId: string,
  update: (item: FeedItem) => FeedItem,
): { data: unknown; changed: boolean } {
  if (hasInfinitePages<unknown>(data)) {
    let changed = false
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (!isFeedItem(item)) {
          return item
        }

        const result = updateFeedItemById(item, statusId, update)
        changed ||= result.changed
        return result.item
      }),
    }))

    return changed ? { data: { ...data, pages }, changed } : { data, changed }
  }

  if (isObject(data) && isFeedItem(data.status) && data.status.id === statusId) {
    return {
      data: {
        ...data,
        status: update(data.status),
      },
      changed: true,
    }
  }

  return { data, changed: false }
}

function updateStatusInKeys(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  statusId: string,
  update: (item: FeedItem) => FeedItem,
) {
  for (const queryKey of queryKeys) {
    const cached = queryClient.getQueryData(queryKey)
    const result = updateStatusInData(cached, statusId, update)

    if (result.changed) {
      queryClient.setQueryData(queryKey, result.data)
    }
  }
}

function findFeedItemById(item: FeedItem, statusId: string): FeedItem | null {
  if (item.id === statusId) {
    return item
  }

  return item.retweetedStatus?.id === statusId ? (item.retweetedStatus as FeedItem) : null
}

function findStatusInData(data: unknown, statusId: string): FeedItem | null {
  if (hasInfinitePages<unknown>(data)) {
    for (const page of data.pages) {
      for (const item of page.items) {
        if (!isFeedItem(item)) {
          continue
        }

        const found = findFeedItemById(item, statusId)
        if (found) {
          return found
        }
      }
    }
  }

  if (isObject(data) && isFeedItem(data.status) && data.status.id === statusId) {
    return data.status
  }

  return null
}

function collectStatusCommentCounts(queryClient: QueryClient, statusId: string) {
  const commentsByKey = new Map<QueryKey, number>()

  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ['weibo'] })) {
    const item = findStatusInData(data, statusId)
    if (item) {
      commentsByKey.set(queryKey, item.stats.comments)
    }
  }

  return commentsByKey
}

function updateStatusEverywhere(
  queryClient: QueryClient,
  statusId: string,
  update: (item: FeedItem) => FeedItem,
): QueryKey[] {
  const changedQueryKeys: QueryKey[] = []

  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ['weibo'] })) {
    const result = updateStatusInData(data, statusId, update)
    if (!result.changed) {
      continue
    }

    queryClient.setQueryData(queryKey, result.data)
    changedQueryKeys.push(queryKey)
  }

  return changedQueryKeys
}

function restoreRemovedFavoriteItem(
  queryClient: QueryClient,
  queryKey: QueryKey,
  removedItems: Array<{ pageIndex: number; itemIndex: number; item: FeedItem }>,
  fallbackData: unknown,
) {
  queryClient.setQueryData(queryKey, (current) => {
    if (!hasInfinitePages<unknown>(current)) {
      return fallbackData
    }

    const pages = current.pages.map((page) => ({ ...page, items: [...page.items] }))

    for (const removed of removedItems.toSorted((a, b) => b.itemIndex - a.itemIndex)) {
      const page = pages[removed.pageIndex]
      if (!page || page.items.some((item) => isFeedItem(item) && item.id === removed.item.id)) {
        continue
      }

      page.items.splice(Math.min(removed.itemIndex, page.items.length), 0, removed.item)
    }

    return {
      ...current,
      pages,
    }
  })
}

function removeStatusFromFavorites(
  queryClient: QueryClient,
  context: StatusCacheMutationContext,
  statusId: string,
) {
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ['weibo', 'favorites'] })) {
    if (!hasInfinitePages<unknown>(data)) {
      continue
    }

    const removedItems: Array<{ pageIndex: number; itemIndex: number; item: FeedItem }> = []
    const pages = data.pages.map((page, pageIndex) => ({
      ...page,
      items: page.items.filter((item, itemIndex) => {
        const shouldRemove = isFeedItem(item) && item.id === statusId
        if (shouldRemove) {
          removedItems.push({ pageIndex, itemIndex, item })
        }
        return !shouldRemove
      }),
    }))

    if (removedItems.length === 0) {
      continue
    }

    queryClient.setQueryData(queryKey, { ...data, pages })
    context.rollbacks.push((client) => {
      restoreRemovedFavoriteItem(client, queryKey, removedItems, data)
    })
  }
}

function updateCommentInTree(
  comment: CommentItem,
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
): CommentItem {
  if (comment.id === commentId) {
    return update(comment)
  }

  if (comment.comments.length > 0) {
    return {
      ...comment,
      comments: comment.comments.map((child) => updateCommentInTree(child, commentId, update)),
    }
  }

  return comment
}

export function shouldCancelWeiboQueryForStatusMutation(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey[0] !== 'weibo') return false
  const second = queryKey[1]
  if (second === 'explore' && queryKey[2] === 'groups') return false
  return (
    second === 'timeline' ||
    second === 'explore' ||
    second === 'profile' ||
    second === 'favorites' ||
    second === 'liked-statuses' ||
    second === 'status' ||
    second === 'status-comments' ||
    second === 'nested-comments' ||
    second === 'feed-comments' ||
    second === 'topic' ||
    second === 'notifications'
  )
}

async function prepareMutation(queryClient: QueryClient): Promise<StatusCacheMutationContext> {
  await queryClient.cancelQueries({
    predicate: (query) => shouldCancelWeiboQueryForStatusMutation(query.queryKey),
  })
  return createStatusCacheMutationContext()
}

export async function optimisticallyToggleStatusLike(
  queryClient: QueryClient,
  target: FeedItem,
): Promise<StatusCacheMutationContext> {
  const context = await prepareMutation(queryClient)
  const previousLiked = Boolean(target.liked)
  const previousLikes = target.stats.likes

  const changedQueryKeys = updateStatusEverywhere(queryClient, target.id, (item) => ({
    ...item,
    liked: !item.liked,
    stats: {
      ...item.stats,
      likes: item.stats.likes + (item.liked ? -1 : 1),
    },
  }))

  context.rollbacks.push((client) => {
    updateStatusInKeys(client, changedQueryKeys, target.id, (item) => ({
      ...item,
      liked: previousLiked,
      stats: {
        ...item.stats,
        likes: previousLikes,
      },
    }))
  })

  return context
}

export async function optimisticallyToggleStatusFavorite(
  queryClient: QueryClient,
  target: FeedItem,
): Promise<StatusCacheMutationContext> {
  const context = await prepareMutation(queryClient)
  const previousFavorited = Boolean(target.favorited)

  const changedQueryKeys = updateStatusEverywhere(queryClient, target.id, (item) => ({
    ...item,
    favorited: !item.favorited,
  }))

  context.rollbacks.push((client) => {
    updateStatusInKeys(client, changedQueryKeys, target.id, (item) => ({
      ...item,
      favorited: previousFavorited,
    }))
  })

  if (target.favorited) {
    removeStatusFromFavorites(queryClient, context, target.id)
  }

  return context
}

export async function optimisticallyRemoveStatusFromFavorites(
  queryClient: QueryClient,
  statusId: string,
): Promise<StatusCacheMutationContext> {
  const context = await prepareMutation(queryClient)

  const changedQueryKeys = updateStatusEverywhere(queryClient, statusId, (item) => ({
    ...item,
    favorited: false,
  }))
  context.rollbacks.push((client) => {
    updateStatusInKeys(client, changedQueryKeys, statusId, (item) => ({
      ...item,
      favorited: true,
    }))
  })
  removeStatusFromFavorites(queryClient, context, statusId)

  return context
}

export async function optimisticallyIncrementStatusComments(
  queryClient: QueryClient,
  statusId: string,
): Promise<StatusCacheMutationContext> {
  const context = await prepareMutation(queryClient)

  const previousCommentsByKey = collectStatusCommentCounts(queryClient, statusId)
  const changedQueryKeys = updateStatusEverywhere(queryClient, statusId, (item) => ({
    ...item,
    stats: {
      ...item.stats,
      comments: item.stats.comments + 1,
    },
  }))

  context.rollbacks.push((client) => {
    for (const queryKey of changedQueryKeys) {
      const previousComments = previousCommentsByKey.get(queryKey)
      if (previousComments === undefined) {
        continue
      }

      updateStatusInKeys(client, [queryKey], statusId, (item) => ({
        ...item,
        stats: {
          ...item.stats,
          comments: previousComments,
        },
      }))
    }
  })

  return context
}

function updateCommentInData(
  data: unknown,
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
): { data: unknown; changed: boolean } {
  if (hasInfinitePages<unknown>(data)) {
    let changed = false
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (!isCommentItem(item)) {
          return item
        }

        const next = updateCommentInTree(item, commentId, (comment) => {
          changed = true
          return update(comment)
        })
        return next
      }),
    }))

    return changed ? { data: { ...data, pages }, changed } : { data, changed }
  }

  if (hasItems<unknown>(data)) {
    let changed = false
    const items = data.items.map((item) => {
      if (!isCommentItem(item)) {
        return item
      }

      const next = updateCommentInTree(item, commentId, (comment) => {
        changed = true
        return update(comment)
      })
      return next
    })

    return changed ? { data: { ...data, items }, changed } : { data, changed }
  }

  return { data, changed: false }
}

function updateCommentInKeys(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
) {
  for (const queryKey of queryKeys) {
    const cached = queryClient.getQueryData(queryKey)
    const result = updateCommentInData(cached, commentId, update)

    if (result.changed) {
      queryClient.setQueryData(queryKey, result.data)
    }
  }
}

function updateCommentEverywhere(
  queryClient: QueryClient,
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
): QueryKey[] {
  const changedQueryKeys: QueryKey[] = []

  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ['weibo'] })) {
    const result = updateCommentInData(data, commentId, update)
    if (!result.changed) {
      continue
    }

    queryClient.setQueryData(queryKey, result.data)
    changedQueryKeys.push(queryKey)
  }

  return changedQueryKeys
}

export async function optimisticallyToggleCommentLike(
  queryClient: QueryClient,
  target: CommentItem,
): Promise<StatusCacheMutationContext> {
  const context = await prepareMutation(queryClient)
  const previousLiked = Boolean(target.liked)
  const previousLikeCount = target.likeCount

  const updateComment = (comment: CommentItem) => ({
    ...comment,
    liked: !comment.liked,
    likeCount: comment.likeCount + (comment.liked ? -1 : 1),
  })

  const changedQueryKeys = updateCommentEverywhere(queryClient, target.id, updateComment)

  context.rollbacks.push((client) => {
    updateCommentInKeys(client, changedQueryKeys, target.id, (comment) => ({
      ...comment,
      liked: previousLiked,
      likeCount: previousLikeCount,
    }))
  })

  return context
}
