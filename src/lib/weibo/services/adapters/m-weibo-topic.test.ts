import { describe, expect, it } from 'vitest'

import { adaptMweiboTopicResponse } from '@/lib/weibo/services/adapters/m-weibo-topic'
import { MweiboUnavailableError } from '@/lib/weibo/services/mweibo-errors'

describe('adaptMweiboTopicResponse', () => {
  it('strips trailing full-text label from topic long text previews', () => {
    const result = adaptMweiboTopicResponse({
      ok: 1,
      data: {
        cardlistInfo: {
          total: 1,
          page: 1,
          page_size: 10,
        },
        cards: [
          {
            card_type: 9,
            mblog: {
              id: '501',
              bid: 'P501',
              isLongText: true,
              text: '忙着芒果Tv看#歌手直播# 手机投屏电视📺看歌手，手机还要拿 ...全文',
              user: {
                id: 42,
                screen_name: 'Alice',
                profile_image_url: 'https://wx1.sinaimg.cn/avatar.jpg',
              },
            },
          },
        ],
      },
    })

    expect(result.items[0]?.text).toBe(
      '忙着芒果Tv看#歌手直播# 手机投屏电视📺看歌手，手机还要拿 ...',
    )
    expect(result.items[0]?.isLongText).toBe(true)
  })

  it('strips trailing linked full-text label from topic long text previews', () => {
    const result = adaptMweiboTopicResponse({
      ok: 1,
      data: {
        cardlistInfo: {
          total: 1,
          page: 1,
          page_size: 10,
        },
        cards: [
          {
            card_type: 9,
            mblog: {
              id: '502',
              isLongText: true,
              text: '话题页长文预览 ...<a href="/status/502">全文</a>',
              user: {
                id: 42,
                screen_name: 'Alice',
              },
            },
          },
        ],
      },
    })

    expect(result.items[0]?.text).toBe('话题页长文预览 ...')
    expect(result.items[0]?.isLongText).toBe(true)
  })

  it('keeps a valid empty topic response as an empty feed', () => {
    expect(
      adaptMweiboTopicResponse({
        ok: 1,
        data: {
          cardlistInfo: {
            total: 0,
            page: 1,
            page_size: 10,
          },
          cards: [],
        },
      }),
    ).toEqual({ items: [], nextCursor: null })
  })

  it.each([{ ok: 0 }, { ok: -100 }, { ok: 1 }, null])(
    'rejects non-success payloads instead of presenting them as empty feeds',
    (payload) => {
      expect(() => adaptMweiboTopicResponse(payload)).toThrowError(MweiboUnavailableError)
    },
  )
})
