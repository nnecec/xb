import { describe, expect, it } from 'vitest'

import { createRouteStore } from '@/features/weibo/route/router-sync'

describe('createRouteStore', () => {
  it('updates the descriptor from a route-change message', () => {
    const store = createRouteStore('https://weibo.com/')

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          source: 'xb',
          type: 'route-change',
          href: 'https://weibo.com/u/1969776354',
        },
      }),
    )

    expect(store.getSnapshot()).toEqual({
      kind: 'profile',
      profileId: '1969776354',
      profileSource: 'u',
      tab: 'posts',
    })

    store.dispose()
  })
})
