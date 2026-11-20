import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'
import {
  myUserRatingQueryKey,
  myUserRatingQueryOptions,
  useFeedRatingBatchSync,
  useRateUser,
  userRatingCacheOnlyQueryOptions,
  userRatingQueryKey,
  userRatingQueryOptions,
} from '@/lib/weibo/rating/xb-rating'

vi.mock('@/lib/app-settings-store', () => ({
  useAppSettings: (selector: (state: { features: { ratingEnabled: boolean } }) => unknown) =>
    selector({ features: { ratingEnabled: true } }),
}))

vi.mock('@/lib/weibo/platform/current-user', () => ({
  getCurrentUserUid: () => '9999',
}))

function createFeedItem(authorId: string, retweetedAuthorId?: string): FeedItem {
  return {
    id: `status-${authorId}`,
    mblogId: `status-${authorId}`,
    isLongText: false,
    author: { id: authorId, name: 'Alice', avatarUrl: null },
    text: 'hello',
    createdAt: '',
    createdAtLabel: '',
    stats: { likes: 0, comments: 0, reposts: 0 },
    images: [],
    media: null,
    retweetedStatus: retweetedAuthorId
      ? {
          id: `rt-${retweetedAuthorId}`,
          mblogId: `rt-${retweetedAuthorId}`,
          isLongText: false,
          author: { id: retweetedAuthorId, name: 'Bob', avatarUrl: null },
          text: 'rt',
          createdAt: '',
          createdAtLabel: '',
          stats: { likes: 0, comments: 0, reposts: 0 },
          images: [],
          media: null,
        }
      : undefined,
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function mockJsonResponse(data: unknown) {
  return {
    ok: true,
    json: async () => data,
  }
}

describe('rating query options', () => {
  it('keeps summaries fresh for one hour and cached for one day', () => {
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * 60 * 60 * 1000

    expect(userRatingQueryOptions('1001').staleTime).toBe(oneHour)
    expect(userRatingQueryOptions('1001').gcTime).toBe(oneDay)
    expect(userRatingQueryOptions('1001').refetchOnWindowFocus).toBe(false)
    expect(userRatingQueryOptions('1001').refetchOnReconnect).toBe(false)
    expect(userRatingCacheOnlyQueryOptions('1001').enabled).toBe(false)
    expect(myUserRatingQueryOptions('1001').staleTime).toBe(Number.POSITIVE_INFINITY)
    expect(myUserRatingQueryOptions('1001').gcTime).toBe(oneDay)
  })
})

describe('useFeedRatingBatchSync', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockJsonResponse({
          '1001': { avg: 8.2, count: 3, distribution: {} },
        }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('batch-fetches each page and seeds per-user summary cache', async () => {
    const queryClient = createQueryClient()
    const pages = [{ items: [createFeedItem('1001'), createFeedItem('1002', '1003')] }]

    renderHook(() => useFeedRatingBatchSync(pages), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ratings/batch'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ uids: ['1001', '1002', '1003'] }),
        }),
      )
    })
    await waitFor(() => {
      expect(queryClient.getQueryData(userRatingQueryKey('1001'))).toEqual({
        avg: 8.2,
        count: 3,
        distribution: {},
      })
    })
  })
})

describe('useRateUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates only my rating and leaves the public average untouched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ ok: true })))

    const queryClient = createQueryClient()
    const targetUid = '1001'

    queryClient.setQueryData(userRatingQueryKey(targetUid), {
      avg: 8.2,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
    })
    queryClient.setQueryData(myUserRatingQueryKey(targetUid), { stars: 4 })

    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRateUser(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ targetUid, stars: 5 })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ratings/user'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_uid: targetUid, stars: 5 }),
      }),
    )
    expect(queryClient.getQueryData(myUserRatingQueryKey(targetUid))).toEqual({ stars: 5 })
    expect(queryClient.getQueryData(userRatingQueryKey(targetUid))).toEqual({
      avg: 8.2,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: myUserRatingQueryKey(targetUid),
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: userRatingQueryKey(targetUid),
    })
  })
})
