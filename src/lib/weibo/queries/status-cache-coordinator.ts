import type { QueryClient, QueryKey } from '@tanstack/react-query'

import type { FeedItem } from '@/lib/weibo/models/feed'
import type { CommentItem } from '@/lib/weibo/models/status'

export interface StatusCacheCoordinator {
  updateStatus(statusId: string, update: (item: FeedItem) => FeedItem): QueryKey[]
  updateComment(commentId: string, update: (comment: CommentItem) => CommentItem): QueryKey[]
  findStatus(statusId: string): FeedItem | null
}

type InfinitePagesData<Item> = { pages: Array<{ items: Item[] }> }

type ItemsData<Item> = { items: Item[] }

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

function updateFeedItem(item: FeedItem, statusId: string, update: (item: FeedItem) => FeedItem) {
  if (item.id === statusId) return { item: update(item), changed: true }
  if (item.retweetedStatus?.id === statusId) {
    return {
      item: { ...item, retweetedStatus: update(item.retweetedStatus as FeedItem) },
      changed: true,
    }
  }
  return { item, changed: false }
}

function updateStatusData(data: unknown, statusId: string, update: (item: FeedItem) => FeedItem) {
  if (hasInfinitePages<unknown>(data)) {
    let changed = false
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (!isFeedItem(item)) return item
        const result = updateFeedItem(item, statusId, update)
        changed ||= result.changed
        return result.item
      }),
    }))
    return changed ? { data: { ...data, pages }, changed } : { data, changed }
  }
  if (isObject(data) && isFeedItem(data.status) && data.status.id === statusId) {
    return { data: { ...data, status: update(data.status) }, changed: true }
  }
  return { data, changed: false }
}

function updateCommentTree(
  comment: CommentItem,
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
): CommentItem {
  if (comment.id === commentId) return update(comment)
  if (comment.comments.length === 0) return comment
  return {
    ...comment,
    comments: comment.comments.map((child) => updateCommentTree(child, commentId, update)),
  }
}

function updateCommentData(
  data: unknown,
  commentId: string,
  update: (comment: CommentItem) => CommentItem,
) {
  if (hasInfinitePages<unknown>(data)) {
    let changed = false
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (!isCommentItem(item)) return item
        const next = updateCommentTree(item, commentId, (comment) => {
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
      if (!isCommentItem(item)) return item
      const next = updateCommentTree(item, commentId, (comment) => {
        changed = true
        return update(comment)
      })
      return next
    })
    return changed ? { data: { ...data, items }, changed } : { data, changed }
  }
  return { data, changed: false }
}

function findStatus(data: unknown, statusId: string): FeedItem | null {
  const items = hasInfinitePages<unknown>(data)
    ? data.pages.flatMap((page) => page.items)
    : isObject(data) && isFeedItem(data.status)
      ? [data.status]
      : []
  for (const item of items) {
    if (!isFeedItem(item)) continue
    if (item.id === statusId) return item
    if (item.retweetedStatus?.id === statusId) return item.retweetedStatus as FeedItem
  }
  return null
}

export function createStatusCacheCoordinator(queryClient: QueryClient): StatusCacheCoordinator {
  const queryEntries = () => queryClient.getQueriesData({ queryKey: ['weibo'] })

  return {
    updateStatus(statusId, update) {
      const changedKeys: QueryKey[] = []
      for (const [queryKey, data] of queryEntries()) {
        const result = updateStatusData(data, statusId, update)
        if (!result.changed) continue
        queryClient.setQueryData(queryKey, result.data)
        changedKeys.push(queryKey)
      }
      return changedKeys
    },
    updateComment(commentId, update) {
      const changedKeys: QueryKey[] = []
      for (const [queryKey, data] of queryEntries()) {
        const result = updateCommentData(data, commentId, update)
        if (!result.changed) continue
        queryClient.setQueryData(queryKey, result.data)
        changedKeys.push(queryKey)
      }
      return changedKeys
    },
    findStatus(statusId) {
      for (const [, data] of queryEntries()) {
        const item = findStatus(data, statusId)
        if (item) return item
      }
      return null
    },
  }
}
