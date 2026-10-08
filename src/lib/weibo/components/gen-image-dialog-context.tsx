import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { longTextQueryOptions } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { mergeLongTextIntoFeedItem } from '@/lib/weibo/utils/transform'

interface GenImageDialogContextValue {
  openGenImage: (item: FeedItem) => void
  closeGenImage: () => void
  genImageItem: FeedItem | null
  resolvedItem: FeedItem | null
  isLoadingLongText: boolean
}

const GenImageDialogContext = createContext<GenImageDialogContextValue | null>(null)

interface GenImageDialogProviderProps {
  children: ReactNode
}

export function GenImageDialogProvider({ children }: GenImageDialogProviderProps) {
  const [genImageItem, setGenImageItem] = useState<FeedItem | null>(null)
  const longTextEnabled = genImageItem?.isLongText ?? false
  const retweetedLongTextEnabled = genImageItem?.retweetedStatus?.isLongText ?? false
  const canLoadLongText = longTextEnabled
  const canLoadRetweetedLongText = retweetedLongTextEnabled

  const { data: longText, isLoading: isLoadingLongText } = useQuery({
    ...longTextQueryOptions(genImageItem?.mblogId ?? null, longTextEnabled && canLoadLongText),
  })

  const { data: retweetedLongText, isLoading: isLoadingRetweetedLongText } = useQuery({
    ...longTextQueryOptions(
      genImageItem?.retweetedStatus?.mblogId ?? null,
      retweetedLongTextEnabled && canLoadRetweetedLongText,
    ),
  })

  const hasResolvedLongText = Boolean(
    longText && (longText.longTextContent?.trim() || longText.longTextContent_raw?.trim()),
  )

  const hasResolvedRetweetedLongText = Boolean(
    retweetedLongText &&
    (retweetedLongText.longTextContent?.trim() || retweetedLongText.longTextContent_raw?.trim()),
  )

  let resolvedItem = genImageItem

  // Merge main item long text
  if (resolvedItem && longTextEnabled && longText && hasResolvedLongText) {
    resolvedItem = mergeLongTextIntoFeedItem(resolvedItem, longText)
  }

  // Merge retweeted status long text
  if (
    resolvedItem?.retweetedStatus &&
    retweetedLongTextEnabled &&
    retweetedLongText &&
    hasResolvedRetweetedLongText
  ) {
    resolvedItem = {
      ...resolvedItem,
      retweetedStatus: mergeLongTextIntoFeedItem(resolvedItem.retweetedStatus, retweetedLongText),
    }
  }

  const isLoading = isLoadingLongText || isLoadingRetweetedLongText

  return (
    <GenImageDialogContext.Provider
      value={{
        openGenImage: setGenImageItem,
        closeGenImage: () => {
          setGenImageItem(null)
        },
        genImageItem,
        resolvedItem,
        isLoadingLongText: isLoading,
      }}
    >
      {children}
    </GenImageDialogContext.Provider>
  )
}

export function useGenImageDialog(): GenImageDialogContextValue {
  const ctx = useContext(GenImageDialogContext)
  if (!ctx) {
    throw new Error('useGenImageDialog must be used within GenImageDialogProvider')
  }
  return ctx
}
