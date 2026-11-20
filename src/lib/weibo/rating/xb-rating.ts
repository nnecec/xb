/**
 * xb Rating System
 *
 * Self-contained module for user rating functionality.
 * Combines client, signing, and TanStack Query logic in one place.
 */

import { useMutation, useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAppSettings } from '@/lib/app-settings-store'
import type { FeedItem } from '@/lib/weibo/models/feed'
import type {
  MyRatingResponse,
  RateResponse,
  RateUserPayload,
  RatingSummary,
} from '@/lib/weibo/models/rating'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'

// ─── Configuration ───

const XB_SERVER_BASE = (
  import.meta.env.XB_SERVER_URL || 'https://xb-server.nnecec-3d5.workers.dev'
).replace(/\/+$/, '')

const XB_SIGN_SECRET = import.meta.env.VITE_XB_SIGN_SECRET ?? import.meta.env.XB_SIGN_SECRET ?? ''

const RATING_SUMMARY_STALE_TIME = 60 * 60 * 1000
const RATING_SUMMARY_CACHE_TIME = 24 * 60 * 60 * 1000
const MY_RATING_CACHE_TIME = 24 * 60 * 60 * 1000

// ─── Signing (compatibility-only; client-bundled secrets are public) ───

async function signXbServerRequest(uid: string, path: string): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(Date.now() / 1000))

  const headers: Record<string, string> = {
    'X-XB-UID': uid,
    'X-XB-Timestamp': timestamp,
  }

  if (XB_SIGN_SECRET) {
    const payload = `${timestamp}.${uid}.${path}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(XB_SIGN_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    headers['X-XB-Signature'] = hex
  }

  return headers
}

// ─── Client (inlined from xb-server-client.ts) ───

async function xbFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  options?: { body?: unknown },
): Promise<T> {
  const url = `${XB_SERVER_BASE}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const uid = getCurrentUserUid()
  if (!uid) throw new Error('xb-rating-not-logged-in')

  Object.assign(headers, await signXbServerRequest(uid, path))

  const response = await fetch(url, {
    method,
    headers,
    ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
  })

  if (!response.ok) {
    let errorMsg = `xb-rating-fetch-failed:${response.status}`
    try {
      const errorBody = (await response.json()) as { error?: string }
      if (errorBody.error) errorMsg = errorBody.error
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg)
  }

  const data = (await response.json()) as T
  return data
}

async function getUserRatingSummary(uid: string): Promise<RatingSummary> {
  return xbFetch<RatingSummary>('GET', `/api/ratings/user/${uid}`)
}

async function getMyUserRating(targetUid: string): Promise<MyRatingResponse> {
  return xbFetch<MyRatingResponse>('GET', `/api/ratings/user/${targetUid}/me`)
}

async function batchGetUserRatingSummaries(uids: string[]): Promise<Record<string, RatingSummary>> {
  return xbFetch<Record<string, RatingSummary>>('POST', '/api/ratings/batch', {
    body: { uids },
  })
}

async function rateUser(payload: RateUserPayload): Promise<RateResponse> {
  return xbFetch<RateResponse>('POST', '/api/ratings/user', {
    body: payload,
  })
}

// ─── Query key factories ───

export function userRatingQueryKey(uid: string) {
  return ['rating', 'user', uid] as const
}

export function myUserRatingQueryKey(uid: string) {
  return ['rating', 'user', uid, 'me'] as const
}

function batchRatingQueryKey(uids: string[]) {
  return ['rating', 'batch', ...[...uids].sort()] as const
}

// ─── Query options ───

export function userRatingQueryOptions(uid: string) {
  return {
    queryKey: userRatingQueryKey(uid),
    queryFn: () => getUserRatingSummary(uid),
    staleTime: RATING_SUMMARY_STALE_TIME,
    gcTime: RATING_SUMMARY_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: uid !== '',
  }
}

/** Read batch-seeded summary cache only; never hits the single-user API. */
export function userRatingCacheOnlyQueryOptions(uid: string) {
  return {
    ...userRatingQueryOptions(uid),
    enabled: false,
  }
}

export function myUserRatingQueryOptions(uid: string) {
  return {
    queryKey: myUserRatingQueryKey(uid),
    queryFn: () => getMyUserRating(uid),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: MY_RATING_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: uid !== '',
  }
}

function batchRatingQueryOptions(uids: string[]) {
  return {
    queryKey: batchRatingQueryKey(uids),
    queryFn: () => batchGetUserRatingSummaries(uids),
    staleTime: RATING_SUMMARY_STALE_TIME,
    gcTime: RATING_SUMMARY_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: uids.length > 0,
  }
}

// ─── Helpers ───

/** Author UIDs from a timeline page (primary + retweeted authors). */
function extractFeedAuthorUids(items: FeedItem[]): string[] {
  const uids = new Set<string>()
  for (const item of items) {
    if (item.author.id) {
      uids.add(item.author.id)
    }
    const retweetedUid = item.retweetedStatus?.author.id
    if (retweetedUid) {
      uids.add(retweetedUid)
    }
  }
  return [...uids]
}

function seedUserRatingSummaries(
  queryClient: QueryClient,
  summaries: Record<string, RatingSummary>,
) {
  for (const [uid, summary] of Object.entries(summaries)) {
    queryClient.setQueryData(userRatingQueryKey(uid), summary)
  }
}

// ─── Hooks ───

/** Batch-fetch rating summaries per feed page and seed per-uid query cache. */
export function useFeedRatingBatchSync(pages: Array<{ items: FeedItem[] }> | undefined) {
  const queryClient = useQueryClient()
  const ratingEnabled = useAppSettings((s) => s.features.ratingEnabled)
  const loggedIn = getCurrentUserUid() !== null

  const pageUidLists = useMemo(
    () => pages?.map((page) => extractFeedAuthorUids(page.items)) ?? [],
    [pages],
  )

  useQueries({
    queries: pageUidLists.map((uids) => ({
      ...batchRatingQueryOptions(uids),
      enabled: ratingEnabled && loggedIn && uids.length > 0,
      queryFn: async () => {
        const summaries = await batchGetUserRatingSummaries(uids)
        seedUserRatingSummaries(queryClient, summaries)
        return summaries
      },
    })),
  })
}

export function useRateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetUid, stars }: { targetUid: string; stars: number }) =>
      rateUser({ target_uid: targetUid, stars }),
    onMutate: async ({ targetUid, stars }) => {
      await queryClient.cancelQueries({ queryKey: myUserRatingQueryKey(targetUid) })
      const prevMyRating = queryClient.getQueryData<{ stars: number | null }>(
        myUserRatingQueryKey(targetUid),
      )

      queryClient.setQueryData(myUserRatingQueryKey(targetUid), { stars })

      return { prevMyRating, targetUid }
    },
    onError: (_err, { targetUid }, context) => {
      if (context?.prevMyRating !== undefined) {
        queryClient.setQueryData(myUserRatingQueryKey(targetUid), context.prevMyRating)
        return
      }

      queryClient.removeQueries({ queryKey: myUserRatingQueryKey(targetUid), exact: true })
    },
    onSuccess: (_data, { targetUid }) => {
      void queryClient.invalidateQueries({ queryKey: myUserRatingQueryKey(targetUid) })
    },
  })
}
