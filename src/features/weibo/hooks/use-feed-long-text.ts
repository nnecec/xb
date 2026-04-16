import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { FeedItem } from '@/features/weibo/models/feed'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'
import { mergeLongTextIntoFeedItem } from '@/features/weibo/utils/transform'

export function useFeedLongText(item: FeedItem) {
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
  const hasResolvedLongText = Boolean(
    longText && (longText.longTextContent?.trim() || longText.longTextContent_raw?.trim()),
  )
  const resolvedItem =
    longTextEnabled && longText && hasResolvedLongText
      ? mergeLongTextIntoFeedItem(item, longText)
      : item
  const hasLongTextError = longTextError instanceof Error

  return {
    resolvedItem,
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
