import { describe, expect, it } from 'vitest'

import {
  COMMENT_INFINITE_QUERY_MAX_PAGES,
  exploreTimelineInfiniteOptions,
  favoritesInfiniteOptions,
  FEED_INFINITE_QUERY_MAX_PAGES,
  friendsInfiniteOptions,
  homeTimelineInfiniteOptions,
  likedStatusesInfiniteOptions,
  profilePostsInfiniteOptions,
  profileSearchInfiniteOptions,
  RELATION_INFINITE_QUERY_MAX_PAGES,
  statusCommentsInfiniteOptions,
  nestedCommentsInfiniteOptions,
  topicSearchInfiniteOptions,
  TOPIC_INFINITE_QUERY_MAX_PAGES,
} from '@/lib/weibo/data/weibo-data'
import { DEFAULT_PROFILE_SEARCH_FILTERS } from '@/lib/weibo/route/profile-search-params'

describe('feed infinite query cache policy', () => {
  it('bounds home timeline cached pages while preserving pagination policy', () => {
    const options = homeTimelineInfiniteOptions('following')

    expect(options.queryKey).toEqual(['weibo', 'timeline', 'following', 'default'])
    expect(options.initialPageParam).toBeNull()
    expect(options.maxPages).toBe(FEED_INFINITE_QUERY_MAX_PAGES)
    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(Infinity)
  })

  it('bounds explore timeline cached pages while preserving pagination policy', () => {
    const options = exploreTimelineInfiniteOptions({
      gid: '102803',
      title: '热门',
      containerid: '102803',
    })

    expect(options.queryKey).toEqual(['weibo', 'explore', '102803'])
    expect(options.initialPageParam).toBeNull()
    expect(options.maxPages).toBe(FEED_INFINITE_QUERY_MAX_PAGES)
    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(Infinity)
  })

  it('bounds remaining feed-like infinite query cached pages', () => {
    const profileSearchParams = {
      query: 'hello',
      starttime: null,
      endtime: 1,
      filters: DEFAULT_PROFILE_SEARCH_FILTERS,
    }

    expect(profilePostsInfiniteOptions('uid').maxPages).toBe(FEED_INFINITE_QUERY_MAX_PAGES)
    expect(profileSearchInfiniteOptions('uid', profileSearchParams).maxPages).toBe(
      FEED_INFINITE_QUERY_MAX_PAGES,
    )
    expect(favoritesInfiniteOptions('uid').maxPages).toBe(FEED_INFINITE_QUERY_MAX_PAGES)
    expect(likedStatusesInfiniteOptions('uid').maxPages).toBe(FEED_INFINITE_QUERY_MAX_PAGES)
  })

  it('bounds comment infinite query cached pages', () => {
    expect(statusCommentsInfiniteOptions('status', 'author').maxPages).toBe(
      COMMENT_INFINITE_QUERY_MAX_PAGES,
    )
    expect(nestedCommentsInfiniteOptions('status', 'author').maxPages).toBe(
      COMMENT_INFINITE_QUERY_MAX_PAGES,
    )
  })

  it('bounds relation and topic infinite query cached pages', () => {
    expect(friendsInfiniteOptions('uid', 'following').maxPages).toBe(
      RELATION_INFINITE_QUERY_MAX_PAGES,
    )
    expect(topicSearchInfiniteOptions('topic').maxPages).toBe(TOPIC_INFINITE_QUERY_MAX_PAGES)
  })
})

describe('topicSearchInfiniteOptions getNextPageParam', () => {
  const getNextPageParam = topicSearchInfiniteOptions('topic').getNextPageParam

  it('returns lastPageParam + 1 when items and nextCursor are present', () => {
    const lastPage = {
      items: [{ id: '1' } as never],
      nextCursor: '3',
    }
    expect(getNextPageParam(lastPage, [], 2)).toBe(3)
  })

  it('uses lastPageParam not allPages.length after maxPages trims pages', () => {
    const lastPage = {
      items: [{ id: '1' } as never],
      nextCursor: '11',
    }
    const allPages = Array.from({ length: 8 }, () => lastPage)
    expect(getNextPageParam(lastPage, allPages, 10)).toBe(11)
  })

  it('returns undefined when nextCursor is null', () => {
    const lastPage = {
      items: [{ id: '1' } as never],
      nextCursor: null,
    }
    expect(getNextPageParam(lastPage, [], 2)).toBeUndefined()
  })

  it('returns undefined when items are empty', () => {
    const lastPage = {
      items: [],
      nextCursor: '3',
    }
    expect(getNextPageParam(lastPage, [], 2)).toBeUndefined()
  })
})
