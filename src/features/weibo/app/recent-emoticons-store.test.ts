import { beforeEach, describe, expect, it } from 'vitest'

import {
  createRecentEmoticonsStore,
  RECENT_EMOTICONS_STORAGE_KEY,
  resetRecentEmoticonsStoreForTest,
} from '@/features/weibo/app/recent-emoticons-store'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: async () => ({ [RECENT_EMOTICONS_STORAGE_KEY]: stored }),
    set: async (items: Record<string, unknown>) => {
      stored = items[RECENT_EMOTICONS_STORAGE_KEY]
    },
    read: () => stored,
  }
}

describe('recent-emoticons-store', () => {
  beforeEach(() => {
    resetRecentEmoticonsStoreForTest()
  })

  it('hydrates and keeps the latest 10 unique emoticons', async () => {
    const storage = createStorageArea([{ phrase: '[赞]', url: 'https://face/zan.png' }])
    const store = createRecentEmoticonsStore(storage)

    await store.getState().hydrate()
    await store.getState().remember({ phrase: '[色]', url: 'https://face/se.png' })
    await store.getState().remember({ phrase: '[赞]', url: 'https://face/zan-new.png' })

    expect(store.getState().items).toEqual([
      { phrase: '[赞]', url: 'https://face/zan-new.png' },
      { phrase: '[色]', url: 'https://face/se.png' },
    ])

    for (let index = 0; index < 12; index += 1) {
      await store.getState().remember({ phrase: `[${index}]`, url: `https://face/${index}.png` })
    }

    expect(store.getState().items).toHaveLength(10)
    expect(storage.read()).toHaveLength(10)
  })
})
