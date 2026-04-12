import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { FeedItem } from '@/features/weibo/models/feed'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'

export function useFeedLongText(item: Pick<FeedItem, 'isLongText' | 'mblogId' | 'text'>) {
  const [longTextEnabled, setLongTextEnabled] = useState(false)
  const canLoadLongText = item.isLongText
  const {
    data: longText,
    error: longTextError,
    isLoading: isLongTextLoading,
    refetch: refetchLongText,
  } = useQuery({
    queryKey: ['weibo', 'longtext', item.mblogId],
    queryFn: () => loadStatusLongText(item.mblogId!),
    enabled: longTextEnabled && canLoadLongText,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
  const resolvedText =
    longTextEnabled && longText !== undefined && longText !== '' ? longText : item.text
  const hasLongTextError = longTextError instanceof Error

  return {
    resolvedText,
    shouldShowLoadLongText: canLoadLongText && (!longTextEnabled || hasLongTextError),
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText: () => {
      if (!longTextEnabled) {
        setLongTextEnabled(true)
        return
      }

      void refetchLongText()
    },
  }
}
