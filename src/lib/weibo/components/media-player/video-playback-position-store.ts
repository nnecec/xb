import { createStore, type StoreApi } from 'zustand/vanilla'

import { createSingletonStoreAccess } from '@/lib/zustand-singleton-store'

interface PlaybackPositionEntry {
  currentTime: number
  duration: number
  updatedAt: number
}

interface PlaybackPositionState {
  positions: Map<string, PlaybackPositionEntry>
  savePosition: (sourceKey: string, currentTime: number, duration: number) => void
  getPosition: (sourceKey: string) => PlaybackPositionEntry | undefined
  removePosition: (sourceKey: string) => void
}

const MAX_AGE = 30 * 60 * 1000
const MAX_ENTRIES = 100

function evictStaleEntries(positions: Map<string, PlaybackPositionEntry>) {
  const now = Date.now()
  for (const [key, entry] of positions) {
    if (now - entry.updatedAt > MAX_AGE) {
      positions.delete(key)
    }
  }
  while (positions.size > MAX_ENTRIES) {
    const oldest = [...positions.entries()].reduce((a, b) =>
      a[1].updatedAt < b[1].updatedAt ? a : b,
    )
    positions.delete(oldest[0])
  }
}

function createPlaybackPositionStore(): StoreApi<PlaybackPositionState> {
  return createStore<PlaybackPositionState>((set, get) => ({
    positions: new Map(),

    savePosition(sourceKey, currentTime, duration) {
      set((state) => {
        const next = new Map(state.positions)
        next.set(sourceKey, { currentTime, duration, updatedAt: Date.now() })
        evictStaleEntries(next)
        return { positions: next }
      })
    },

    getPosition(sourceKey) {
      return get().positions.get(sourceKey)
    },

    removePosition(sourceKey) {
      set((state) => {
        const next = new Map(state.positions)
        next.delete(sourceKey)
        return { positions: next }
      })
    },
  }))
}

const playbackPositionStoreAccess = createSingletonStoreAccess(createPlaybackPositionStore)

export const getPlaybackPositionStore = playbackPositionStoreAccess.getStore
export const resetPlaybackPositionStoreForTest = playbackPositionStoreAccess.resetForTest
