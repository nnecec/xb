import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T12:00:00+08:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('normalizes statuses into feed items', () => {
    expect(adaptTimelineResponse(payload)).toEqual({
      items: [
        {
          id: '501',
          isLongText: false,
          mblogId: null,
          text: 'hello world',
          createdAtLabel: '10:00',
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
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: '999',
    })
  })

  it('supports nested list payloads and empty cursors', () => {
    expect(
      adaptTimelineResponse({
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
      }),
    ).toEqual({
      items: [
        {
          id: '777',
          isLongText: false,
          mblogId: null,
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
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: null,
    })
  })

  it('treats zero cursor values as the end of pagination', () => {
    expect(
      adaptTimelineResponse({
        statuses: [
          {
            idstr: '901',
            text_raw: 'last page item',
            user: { idstr: '1', screen_name: 'Alice' },
          },
        ],
        max_id: '0',
      }),
    ).toEqual({
      items: [
        {
          id: '901',
          isLongText: false,
          mblogId: null,
          text: 'last page item',
          createdAtLabel: '',
          author: {
            id: '1',
            name: 'Alice',
            avatarUrl: null,
          },
          stats: {
            likes: 0,
            comments: 0,
            reposts: 0,
          },
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: null,
    })
  })

  it('maps short links to url title entities', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '888',
          text_raw: '看这个视频 http://t.cn/AXMyKy9F',
          user: { idstr: '1', screen_name: 'Alice' },
          url_struct: [
            {
              short_url: 'http://t.cn/AXMyKy9F',
              url_title: '大米评测的微博视频',
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/AXMyKy9F',
        title: '大米评测的微博视频',
      },
    ])
  })

  it('skips ad statuses when isAd is 1', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: 'ad-1',
          text_raw: 'sponsored',
          isAd: 1,
          user: { idstr: '9', screen_name: 'Ad Bot' },
        },
        {
          idstr: 'normal-1',
          text_raw: 'real post',
          user: { idstr: '10', screen_name: 'Real User' },
        },
      ],
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('normal-1')
  })
})
