import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { getAppSettingsStore } from '@/lib/app-settings-store'
import type { FeedItem } from '@/lib/weibo/models/feed'

export interface HistoryEntry {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  textSnippet: string
  statusId: string | null
  readAt: number
}

export interface BrowsingHistoryStore {
  entries: HistoryEntry[]
  addEntry: (item: FeedItem) => void
  clearHistory: () => void
  removeEntry: (id: string) => void
  trimToLimit: (limit: number) => void
}

const STORAGE_KEY = 'xb:browsing-history'

function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function saveToStorage(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage full or unavailable
  }
}

function getBrowsingHistoryLimit(): number {
  return getAppSettingsStore().getState().feed.browsingHistoryLimit
}

function trimEntries(entries: HistoryEntry[], limit: number): HistoryEntry[] {
  return entries.slice(0, limit)
}

export const browsingHistoryStore = createStore<BrowsingHistoryStore>((set) => ({
  entries: loadFromStorage(),
  addEntry: (item) =>
    set((state) => {
      const entry: HistoryEntry = {
        id: item.id,
        authorId: item.author.id,
        authorName: item.author.name,
        authorAvatar: item.author.avatarUrl,
        textSnippet: item.text.slice(0, 80),
        statusId: item.mblogId,
        readAt: Date.now(),
      }
      const filtered = state.entries.filter((e) => e.id !== item.id)
      const entries = trimEntries([entry, ...filtered], getBrowsingHistoryLimit())
      saveToStorage(entries)
      return { entries }
    }),
  clearHistory: () => {
    saveToStorage([])
    set({ entries: [] })
  },
  removeEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id)
      saveToStorage(entries)
      return { entries }
    }),
  trimToLimit: (limit) =>
    set((state) => {
      const entries = trimEntries(state.entries, limit)
      saveToStorage(entries)
      return { entries }
    }),
}))

export function useBrowsingHistory<T>(selector: (state: BrowsingHistoryStore) => T): T {
  return useStore(browsingHistoryStore, selector)
}
