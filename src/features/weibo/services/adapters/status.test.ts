import { describe, expect, it } from 'vitest'

import {
  adaptStatusCommentsResponse,
  adaptStatusDetailResponse,
} from '@/features/weibo/services/adapters/status'

describe('adaptStatusDetailResponse', () => {
  it('returns normalized main status', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: 'main post',
      created_at: 'today',
      user: { idstr: '1', screen_name: 'Alice' },
      analysis_extra: 'statusAuthorId:1|mblog_rt_mid:502',
      url_struct: [
        {
          short_url: 'http://t.cn/AXMyKy9F',
          url_title: '大米评测的微博视频',
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
})
