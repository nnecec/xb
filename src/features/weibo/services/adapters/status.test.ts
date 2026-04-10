import { describe, expect, it } from 'vitest'

import {
  adaptStatusCommentsResponse,
  adaptStatusDetailResponse,
} from '@/features/weibo/services/adapters/status'

describe('adaptStatusDetailResponse', () => {
  it('returns normalized main status', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: '#天才卡丁车装修进度#\n\nmain post',
      created_at: 'today',
      user: { idstr: '1', screen_name: 'Alice' },
      analysis_extra: 'statusAuthorId:1|mblog_rt_mid:502',
      url_struct: [
        {
          short_url: 'http://t.cn/AXMyKy9F',
          url_title: '大米评测的微博视频',
          url_type: 39,
        },
      ],
      topic_struct: [
        {
          topic_title: '天才卡丁车装修进度',
        },
      ],
      retweeted_status: {
        idstr: '502',
        text_raw: 'retweeted post http://t.cn/AXMyKy9F',
        created_at: 'today',
        user: { idstr: '2', screen_name: 'Bob' },
        page_info: {
          object_type: 'video',
          media_info: {
            stream_url: 'https://example.com/video.mp4',
            playback_list: [
              {
                meta: { quality_index: 720 },
                play_info: { url: 'https://example.com/video-720.mp4' },
              },
              {
                meta: { quality_index: 2160 },
                play_info: { url: 'https://example.com/video-2160.mp4' },
              },
            ],
            name: 'video',
          },
        },
      },
    })

    expect(result.status.id).toBe('501')
    expect(result.status.images).toEqual([])
    expect(result.status.retweetedStatus?.id).toBe('502')
    expect(result.status.retweetedStatus?.media?.streamUrl).toContain('video-2160.mp4')
    expect(result.status.retweetedStatus?.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/AXMyKy9F',
        title: '大米评测的微博视频',
        url: 'http://t.cn/AXMyKy9F',
      },
    ])
    expect(result.status.topicEntities).toEqual([
      {
        title: '天才卡丁车装修进度',
        url: 'https://s.weibo.com/weibo?q=%23%E5%A4%A9%E6%89%8D%E5%8D%A1%E4%B8%81%E8%BD%A6%E8%A3%85%E4%BF%AE%E8%BF%9B%E5%BA%A6%23',
      },
    ])
    expect(result.status.media).toBeNull()
  })

  it('unwraps { ok, data } so retweeted_status is visible (PC ajax shape)', () => {
    const result = adaptStatusDetailResponse({
      ok: 1,
      data: {
        idstr: '501',
        text_raw: 'forward',
        created_at: 'today',
        user: { idstr: '1', screen_name: 'Alice' },
        retweeted_status: {
          idstr: '502',
          text_raw: 'original',
          created_at: 'today',
          user: { idstr: '2', screen_name: 'Bob' },
        },
      },
    })

    expect(result.status.id).toBe('501')
    expect(result.status.retweetedStatus?.id).toBe('502')
    expect(result.status.retweetedStatus?.text).toBe('original')
  })

  it('does not inherit retweeted url_struct entries without url_type', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: 'main',
      user: { idstr: '1', screen_name: 'Alice' },
      analysis_extra: 'statusAuthorId:1|mblog_rt_mid:502',
      url_struct: [
        { short_url: 'http://t.cn/PLAIN', url_title: 'plain' },
        { short_url: 'http://t.cn/LINK', url_title: 'real link', url_type: 39 },
      ],
      retweeted_status: {
        idstr: '502',
        text_raw: 'retweeted http://t.cn/PLAIN http://t.cn/LINK',
        user: { idstr: '2', screen_name: 'Bob' },
      },
    })

    expect(result.status.retweetedStatus?.urlEntities).toEqual([
      {
        shortUrl: 'http://t.cn/LINK',
        title: 'real link',
        url: 'http://t.cn/LINK',
      },
    ])
  })
})

describe('adaptStatusCommentsResponse', () => {
  it('returns nested comments and reply comment', () => {
    const result = adaptStatusCommentsResponse({
      data: [
        {
          idstr: '1001',
          text_raw: '一级评论',
          created_at: 'today',
          like_count: 3,
          source: '来自北京',
          user: { idstr: '1', screen_name: 'Alice' },
          reply_comment: {
            idstr: '9001',
            text_raw: '被回复评论',
            user: { idstr: '9', screen_name: 'Root' },
          },
          comments: [
            {
              idstr: '1002',
              text_raw: '二级评论',
              created_at: 'today',
              like_count: 1,
              user: { idstr: '2', screen_name: 'Bob' },
            },
          ],
        },
      ],
      max_id: '123',
    })

    expect(result.nextCursor).toBe('123')
    expect(result.items[0]?.replyComment?.id).toBe('9001')
    expect(result.items[0]?.comments[0]?.id).toBe('1002')
    expect(result.items[0]?.likeCount).toBe(3)
  })

  it('renders comment links by url_type and maps comment images in pic_ids order', () => {
    const result = adaptStatusCommentsResponse({
      data: [
        {
          idstr: '1001',
          text_raw: '评论正文 http://t.cn/commentPic',
          user: { idstr: '1', screen_name: 'Alice' },
          url_struct: [
            {
              short_url: 'http://t.cn/plain',
              url_title: '不应渲染',
            },
            {
              short_url: 'http://t.cn/commentPic',
              url_title: '查看图片',
              url_type: 39,
              h5_target_url: 'https://photo.weibo.com/comment/1001',
              pic_ids: ['pic-b', 'pic-a'],
              pic_infos: {
                'pic-a': {
                  thumbnail: { url: 'https://img/pic-a-thumb.jpg' },
                  large: { url: 'https://img/pic-a-large.jpg' },
                  woriginal: { url: 'https://img/pic-a-original.jpg' },
                },
                'pic-b': {
                  thumbnail: { url: 'https://img/pic-b-thumb.jpg' },
                  bmiddle: { url: 'https://img/pic-b-bmiddle.jpg' },
                  large: { url: 'https://img/pic-b-large.jpg' },
                },
              },
            },
          ],
          reply_comment: {
            idstr: '9001',
            text_raw: '回复内容 http://t.cn/replyPic',
            user: { idstr: '9', screen_name: 'Root' },
            url_struct: [
              {
                short_url: 'http://t.cn/replyPic',
                url_title: '查看图片',
                url_type: 39,
                h5_target_url: 'https://photo.weibo.com/comment/9001',
                pic_ids: ['reply-pic'],
                pic_infos: {
                  'reply-pic': {
                    thumbnail: { url: 'https://img/reply-thumb.jpg' },
                    large: { url: 'https://img/reply-large.jpg' },
                    woriginal: { url: 'https://img/reply-original.jpg' },
                  },
                },
              },
            ],
          },
        },
      ],
    })

    expect(result.items[0]?.text).toBe('评论正文')
    expect(result.items[0]?.urlEntities).toBeUndefined()
    expect(result.items[0]?.images).toEqual([
      {
        id: 'pic-b',
        thumbnailUrl: 'https://img/pic-b-large.jpg',
        largeUrl: 'https://img/pic-b-large.jpg',
      },
      {
        id: 'pic-a',
        thumbnailUrl: 'https://img/pic-a-large.jpg',
        largeUrl: 'https://img/pic-a-original.jpg',
      },
    ])
    expect(result.items[0]?.replyComment?.text).toBe('回复内容')
    expect(result.items[0]?.replyComment?.urlEntities).toBeUndefined()
    expect(result.items[0]?.replyComment?.images).toEqual([
      {
        id: 'reply-pic',
        thumbnailUrl: 'https://img/reply-large.jpg',
        largeUrl: 'https://img/reply-original.jpg',
      },
    ])
  })

  it('falls back to numeric id for comments and reply comments', () => {
    const result = adaptStatusCommentsResponse({
      data: [
        {
          id: 1001,
          text_raw: '一级评论',
          user: { id: 1, screen_name: 'Alice' },
          reply_comment: {
            id: 9001,
            text_raw: '被回复评论',
            user: { id: 9, screen_name: 'Root' },
          },
          comments: [
            {
              id: 1002,
              text_raw: '二级评论',
              user: { id: 2, screen_name: 'Bob' },
            },
          ],
        },
      ],
    })

    expect(result.items[0]?.id).toBe('1001')
    expect(result.items[0]?.replyComment?.id).toBe('9001')
    expect(result.items[0]?.comments[0]?.id).toBe('1002')
  })
})
