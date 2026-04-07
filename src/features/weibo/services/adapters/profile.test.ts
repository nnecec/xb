import { describe, expect, it } from 'vitest'

import { adaptProfileInfoResponse } from '@/features/weibo/services/adapters/profile'

describe('adaptProfileInfoResponse', () => {
  it('normalizes user identity and bio fields', () => {
    const result = adaptProfileInfoResponse({
      data: {
        user: {
          idstr: '1969776354',
          screen_name: 'Alice',
          description: 'bio',
          avatar_hd: 'https://wx1.sinaimg.cn/large/avatar.jpg',
        },
      },
    })

    expect(result.id).toBe('1969776354')
    expect(result.name).toBe('Alice')
    expect(result.bio).toBe('bio')
  })
})
