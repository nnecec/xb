import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWeiboJson } from '@/features/weibo/services/client'
import { loadHomeTimeline } from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/services/client', () => ({
  fetchWeiboJson: vi.fn(),
}))

describe('weibo-repository', () => {
  beforeEach(() => {
    vi.mocked(fetchWeiboJson).mockReset()
    vi.mocked(fetchWeiboJson).mockResolvedValue({})
  })

  it('loads the following tab from friendstimeline', async () => {
    await expect(loadHomeTimeline('following')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(fetchWeiboJson).toHaveBeenCalledWith('/ajax/feed/friendstimeline', {
      count: 20,
      fid: '110001768015440',
      list_id: '110001768015440',
      refresh: 4,
      since_id: '0',
    })
  })

  it('loads the for-you tab from unreadfriendstimeline', async () => {
    await expect(loadHomeTimeline('for-you')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(fetchWeiboJson).toHaveBeenCalledWith('/ajax/feed/unreadfriendstimeline', {
      since_id: '0',
    })
  })
})
