import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/weibo/models/feed'

const { browsingHistoryLimit } = vi.hoisted(() => ({
  browsingHistoryLimit: { value: 200 },
}))

vi.mock('@/lib/app-settings-store', () => ({
  getAppSettingsStore: () => ({
    getState: () => ({
      browsingHistoryLimit: browsingHistoryLimit.value,
    }),
  }),
}))

import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'

function createFeedItem(id: string, text = `text-${id}`): FeedItem {
  return {
    id,
    mblogId: id,
    isLongText: false,
    author: { id: 'author-1', name: 'Alice', avatarUrl: null },
    text,
    createdAt: '',
    createdAtLabel: '',
    stats: { likes: 0, comments: 0, reposts: 0 },
    images: [],
    media: null,
  }
}

describe('browsingHistoryStore', () => {
  beforeEach(() => {
    browsingHistoryLimit.value = 200
    localStorage.clear()
    browsingHistoryStore.getState().clearHistory()
  })

  it('adds entries and persists them', () => {
    browsingHistoryStore.getState().addEntry(createFeedItem('1', 'hello world'))

    const entries = browsingHistoryStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: '1',
      authorName: 'Alice',
      textSnippet: 'hello world',
    })

    const raw = localStorage.getItem('xb:browsing-history')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toHaveLength(1)
  })

  it('dedupes by id and moves the entry to the front', () => {
    browsingHistoryStore.getState().addEntry(createFeedItem('1', 'first'))
    browsingHistoryStore.getState().addEntry(createFeedItem('2', 'second'))
    browsingHistoryStore.getState().addEntry(createFeedItem('1', 'first again'))

    const ids = browsingHistoryStore.getState().entries.map((entry) => entry.id)
    expect(ids).toEqual(['1', '2'])
    expect(browsingHistoryStore.getState().entries[0]?.textSnippet).toBe('first again')
  })

  it('trims to the browsing history limit from settings', () => {
    browsingHistoryLimit.value = 2
    browsingHistoryStore.getState().addEntry(createFeedItem('1'))
    browsingHistoryStore.getState().addEntry(createFeedItem('2'))
    browsingHistoryStore.getState().addEntry(createFeedItem('3'))

    expect(browsingHistoryStore.getState().entries.map((entry) => entry.id)).toEqual(['3', '2'])
  })

  it('removes and clears entries', () => {
    browsingHistoryStore.getState().addEntry(createFeedItem('1'))
    browsingHistoryStore.getState().addEntry(createFeedItem('2'))
    browsingHistoryStore.getState().removeEntry('1')
    expect(browsingHistoryStore.getState().entries.map((entry) => entry.id)).toEqual(['2'])

    browsingHistoryStore.getState().clearHistory()
    expect(browsingHistoryStore.getState().entries).toEqual([])
    expect(localStorage.getItem('xb:browsing-history')).toBe('[]')
  })
})
