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
          liked: false,
          favorited: false,
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
          liked: false,
          favorited: false,
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
          liked: false,
          favorited: false,
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
              url_type: 39,
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/AXMyKy9F',
        title: '大米评测的微博视频',
        url: 'http://t.cn/AXMyKy9F',
      },
    ])
  })

  it('only maps url_struct entries with url_type to clickable links', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '889',
          text_raw: '看这个视频 http://t.cn/AXMyKy9F 和这段文本 http://t.cn/PLAIN',
          user: { idstr: '1', screen_name: 'Alice' },
          url_struct: [
            {
              short_url: 'http://t.cn/AXMyKy9F',
              url_title: '大米评测的微博视频',
              url_type: 39,
            },
            {
              short_url: 'http://t.cn/PLAIN',
              url_title: '普通文本',
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/AXMyKy9F',
        title: '大米评测的微博视频',
        url: 'http://t.cn/AXMyKy9F',
      },
    ])
  })

  it('exposes url_struct images as imageEntities keyed by short_url without stripping text', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '900',
          text_raw: '//@顾扯淡:好玩吗…………[摊手] http://t.cn/AXxLGfQf',
          user: { idstr: '1', screen_name: 'Alice' },
          url_struct: [
            {
              short_url: 'http://t.cn/AXxLGfQf',
              url_title: '查看图片',
              url_type: 39,
              h5_target_url: 'https://photo.weibo.com/h5/comment/compic_id/1022:abc',
              pic_ids: ['pic-inline'],
              pic_infos: {
                'pic-inline': {
                  thumbnail: { url: 'https://img/inline-thumb.jpg' },
                  large: { url: 'https://img/inline-large.jpg' },
                  woriginal: { url: 'https://img/inline-original.jpg' },
                },
              },
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.text).toBe(
      '//@顾扯淡:好玩吗…………[摊手] http://t.cn/AXxLGfQf',
    )
    expect(result.items[0]?.urlEntities).toBeUndefined()
    expect(result.items[0]?.images).toEqual([])
    expect(result.items[0]?.imageEntities).toEqual({
      'http://t.cn/AXxLGfQf': [
        {
          id: 'pic-inline',
          thumbnailUrl: 'https://img/inline-large.jpg',
          largeUrl: 'https://img/inline-original.jpg',
        },
      ],
    })
  })

  it('keeps reposter url_struct images at the reposter level even when analysis_extra matches the retweeted root', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '901',
          text_raw: '//@顾扯淡:好玩吗 http://t.cn/AXxLGfQf',
          user: { idstr: '1', screen_name: 'Alice' },
          analysis_extra: 'mblog_rt_mid:8888',
          url_struct: [
            {
              short_url: 'http://t.cn/AXxLGfQf',
              url_title: '查看图片',
              url_type: 39,
              pic_ids: ['repost-pic'],
              pic_infos: {
                'repost-pic': {
                  thumbnail: { url: 'https://img/repost-thumb.jpg' },
                  large: { url: 'https://img/repost-large.jpg' },
                  woriginal: { url: 'https://img/repost-original.jpg' },
                },
              },
            },
          ],
          retweeted_status: {
            idstr: '8888',
            text_raw: '原帖内容',
            user: { idstr: '9', screen_name: 'Root' },
            pic_ids: ['retweet-pic'],
            pic_infos: {
              'retweet-pic': {
                thumbnail: { url: 'https://img/retweet-thumb.jpg' },
                large: { url: 'https://img/retweet-large.jpg' },
                woriginal: { url: 'https://img/retweet-original.jpg' },
              },
            },
          },
        },
      ],
    })

    expect(result.items[0]?.text).toBe('//@顾扯淡:好玩吗 http://t.cn/AXxLGfQf')
    expect(result.items[0]?.urlEntities).toBeUndefined()
    expect(result.items[0]?.images).toEqual([])
    expect(result.items[0]?.imageEntities).toEqual({
      'http://t.cn/AXxLGfQf': [
        {
          id: 'repost-pic',
          thumbnailUrl: 'https://img/repost-large.jpg',
          largeUrl: 'https://img/repost-original.jpg',
        },
      ],
    })
    expect(result.items[0]?.retweetedStatus?.images).toEqual([
      {
        id: 'retweet-pic',
        thumbnailUrl: 'https://img/retweet-large.jpg',
        largeUrl: 'https://img/retweet-original.jpg',
      },
    ])
    expect(result.items[0]?.retweetedStatus?.imageEntities).toBeUndefined()
  })

  it('extracts inline emoticons from html text as a fallback map', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '890',
          text_raw: '不知道油价大涨带来的增量有多少[二哈]',
          text: '不知道油价大涨带来的增量有多少<img alt="[二哈]" title="[二哈]" src="https://face.t.sinajs.cn/erha.png" />',
          user: { idstr: '1', screen_name: 'Alice' },
        },
      ],
    })

    expect(result.items[0]?.emoticons).toEqual({
      '[二哈]': {
        phrase: '[二哈]',
        url: 'https://face.t.sinajs.cn/erha.png',
      },
    })
  })

  it('maps topic_struct entries to encoded topic links', () => {
    const result = adaptTimelineResponse({
      statuses: [
        {
          idstr: '889',
          text_raw: '#天才卡丁车装修进度#\n\n今天把大路灯立起来了',
          user: { idstr: '1', screen_name: 'Alice' },
          topic_struct: [
            {
              topic_title: '天才卡丁车装修进度',
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.topicEntities).toEqual([
      {
        title: '天才卡丁车装修进度',
        url: 'https://s.weibo.com/weibo?q=%23%E5%A4%A9%E6%89%8D%E5%8D%A1%E4%B8%81%E8%BD%A6%E8%A3%85%E4%BF%AE%E8%BF%9B%E5%BA%A6%23',
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
