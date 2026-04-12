import { describe, expect, it } from 'vitest'

import {
  adaptProfileInfoResponse,
  mergeProfileDetail,
} from '@/features/weibo/services/adapters/profile'

describe('adaptProfileInfoResponse', () => {
  it('normalizes user identity and bio fields', () => {
    const result = adaptProfileInfoResponse({
      data: {
        user: {
          idstr: '1969776354',
          screen_name: 'Alice',
          description: 'bio',
          avatar_hd: 'https://wx1.sinaimg.cn/large/avatar.jpg',
          followers_count_str: '100万',
          friends_count: 500,
        },
      },
    })

    expect(result.id).toBe('1969776354')
    expect(result.name).toBe('Alice')
    expect(result.bio).toBe('bio')
    expect(result.followersCount).toBe('100万')
    expect(result.friendsCount).toBe(500)
  })
})

describe('mergeProfileDetail', () => {
  it('merges detail data into profile', () => {
    const profile = adaptProfileInfoResponse({
      data: {
        user: {
          idstr: '123',
          screen_name: 'Bob',
          description: 'hello',
        },
      },
    })

    const merged = mergeProfileDetail(profile, {
      data: {
        desc_text: '资深汽车达人',
        ip_location: 'IP属地：青海',
        followers: {
          total_number: 10,
          users: [
            { screen_name: '孙少军09', avatar_large: 'https://example.com/a.jpg' },
            { screen_name: 'flypig', avatar_large: 'https://example.com/b.jpg' },
          ],
        },
      },
    })

    expect(merged.descText).toBe('资深汽车达人')
    expect(merged.bio).toBe('hello')
    expect(merged.ipLocation).toBe('IP属地：青海')
    expect(merged.mutualFollowers).toHaveLength(2)
    expect(merged.mutualFollowerTotal).toBe(10)
  })

  it('uses detail description for bio when present (认证 desc_text stays separate)', () => {
    const profile = adaptProfileInfoResponse({
      data: {
        user: {
          idstr: '123',
          screen_name: 'Bob',
          description: 'from info',
        },
      },
    })

    const merged = mergeProfileDetail(profile, {
      data: {
        desc_text: '认证文案',
        description: 'from detail 简介',
      },
    })

    expect(merged.descText).toBe('认证文案')
    expect(merged.bio).toBe('from detail 简介')
  })
})
