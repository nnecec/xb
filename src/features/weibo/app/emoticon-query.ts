import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { loadEmoticonConfig } from '@/features/weibo/services/weibo-repository'

export const EMOTICON_CONFIG_QUERY_KEY = ['weibo', 'emoticon-config'] as const

export function emoticonConfigQueryOptions() {
  return queryOptions({
    queryKey: EMOTICON_CONFIG_QUERY_KEY,
    queryFn: loadEmoticonConfig,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useEmoticonConfigQuery() {
  return useQuery(emoticonConfigQueryOptions())
}

export function usePrewarmEmoticonConfig() {
  const queryClient = useQueryClient()

  useEffect(() => {
    void queryClient.ensureQueryData(emoticonConfigQueryOptions())
  }, [queryClient])
}
