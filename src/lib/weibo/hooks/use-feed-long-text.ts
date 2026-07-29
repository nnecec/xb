import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { longTextQueryOptions } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { mergeLongTextIntoFeedItem } from '@/lib/weibo/utils/transform'

export function useFeedLongText(item: FeedItem, autoLoad = false) {
  const [longTextEnabled, setLongTextEnabled] = useState(false)
  const canLoadLongText = item.isLongText

  useEffect(() => {
    if (autoLoad && canLoadLongText) {
      setLongTextEnabled(true)
    }
  }, [autoLoad, canLoadLongText])

  const {
    data: longText,
    error: longTextError,
    isLoading: isLongTextLoading,
    refetch: refetchLongText,
  } = useQuery({
    ...longTextQueryOptions(item.mblogId, longTextEnabled && canLoadLongText),
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
