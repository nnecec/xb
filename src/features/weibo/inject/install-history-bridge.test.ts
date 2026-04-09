import { describe, expect, it, vi } from 'vitest'

import { installHistoryBridge } from '@/features/weibo/inject/install-history-bridge'

describe('installHistoryBridge', () => {
  it('posts a route event when pushState is called', () => {
    const spy = vi.spyOn(window, 'postMessage')

    installHistoryBridge(window)
    history.pushState({}, '', '/u/1969776354')

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'xb',
        type: 'route-change',
        href: 'http://localhost:3000/u/1969776354',
      }),
      '*',
    )

    spy.mockRestore()
  })
})
