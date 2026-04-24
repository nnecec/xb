import { createContext, useContext, useState, type ReactNode } from 'react'

import type { FeedItem } from '@/lib/weibo/models/feed'

interface GenImageDialogContextValue {
  openGenImage: (item: FeedItem) => void
  closeGenImage: () => void
  genImageItem: FeedItem | null
}

const GenImageDialogContext = createContext<GenImageDialogContextValue | null>(null)

interface GenImageDialogProviderProps {
  children: ReactNode
}

export function GenImageDialogProvider({ children }: GenImageDialogProviderProps) {
  const [genImageItem, setGenImageItem] = useState<FeedItem | null>(null)

  return (
    <GenImageDialogContext.Provider
      value={{
        openGenImage: setGenImageItem,
        closeGenImage: () => setGenImageItem(null),
        genImageItem,
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
