import { describe, expect, it } from 'vitest'

import { adaptTimelineResponse } from '@/features/weibo/services/adapters/timeline'

const payload = {
  statuses: [
    {
      idstr: '501',
      text_raw: 'hello world',
      created_at: 'Tue Apr 08 10:00:00 +0800 2026',
      attitudes_count: 7,
      comments_count: 3,
      reposts_count: 1,
      user: {
        idstr: '1969776354',
        screen_name: 'Alice',
        avatar_hd: 'https://wx1.sinaimg.cn/large/avatar.jpg',
      },
    },
  ],
  max_id: '999',
}

describe('adaptTimelineResponse', () => {
  it('normalizes statuses into feed items', () => {
    expect(adaptTimelineResponse(payload)).toEqual({
      items: [
        {
          id: '501',
          text: 'hello world',
          createdAtLabel: 'Tue Apr 08 10:00:00 +0800 2026',
          author: {
            id: '1969776354',
            name: 'Alice',
            avatarUrl: 'https://wx1.sinaimg.cn/large/avatar.jpg',
          },
          stats: {
            likes: 7,
            comments: 3,
            reposts: 1,
          },
        },
      ],
      nextCursor: '999',
    })
  })

  it('supports nested list payloads and empty cursors', () => {
    expect(adaptTimelineResponse({
      data: {
        list: [
          {
            mid: 777,
            raw_text: 'nested payload',
            user: {
              id: 42,
              screen_name: 'Bob',
              profile_image_url: 'https://wx4.sinaimg.cn/avatar.jpg',
            },
          },
          null,
          {},
        ],
        since_id: '',
      },
    })).toEqual({
      items: [
        {
          id: '777',
          text: 'nested payload',
          createdAtLabel: '',
          author: {
            id: '42',
            name: 'Bob',
            avatarUrl: 'https://wx4.sinaimg.cn/avatar.jpg',
          },
          stats: {
            likes: 0,
            comments: 0,
            reposts: 0,
          },
        },
      ],
      nextCursor: null,
    })
  })
})
