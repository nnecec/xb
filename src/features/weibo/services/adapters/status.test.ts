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

  it('maps DASH mpd + playback_list to media.dash and keeps progressive fallback', () => {
    const mpd = `<?xml version="1.0"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static"><Period id="1"><AdaptationSet mimeType="video/mp4"><Representation id="dash_720p" bandwidth="1"/></AdaptationSet><AdaptationSet mimeType="audio/mp4"><Representation id="dash_audio" bandwidth="1"/></AdaptationSet></Period></MPD>`
    const result = adaptStatusDetailResponse({
      idstr: '601',
      text_raw: 'dash test',
      user: { idstr: '1', screen_name: 'Alice' },
      page_info: {
        object_type: 'video',
        media_info: {
          mp4_720p_mp4: 'https://example.com/fallback-720.mp4',
          stream_url: 'https://example.com/sd.mp4',
          video_title: 't',
          mpdInfo: { mpdcontent: mpd },
          playback_list: [
            {
              meta: {
                type: 1,
                label: 'dash_1080p',
                quality_index: 1080,
                quality_label: '1080p',
              },
              play_info: {
                type: 1,
                protocol: 'dash',
                label: 'dash_1080p',
                url: 'https://example.com/dash-1080.mp4',
              },
            },
            {
              meta: { type: 2, label: 'dash_audio', quality_index: 360 },
              play_info: {
                type: 2,
                protocol: 'dash',
                url: 'https://example.com/dash-audio.mp4',
              },
            },
          ],
        },
      },
    })

    expect(result.status.media?.streamUrl).toContain('fallback-720.mp4')
    expect(result.status.media?.dash?.manifestXml).toContain('dash_720p')
    expect(result.status.media?.dash?.qualities.map((q) => q.id)).toEqual(['dash_1080p'])
  })

  it('builds DASH manifest from playback_list when mpdInfo is missing', () => {
    const result = adaptStatusDetailResponse({
      idstr: '701',
      text_raw: 'dash without mpdInfo',
      user: { idstr: '1', screen_name: 'Alice' },
      page_info: {
        object_type: 'video',
        media_info: {
          stream_url: 'https://example.com/fallback.mp4',
          playback_list: [
            {
              meta: { type: 1, label: 'dash_720p', quality_index: 720, quality_label: '720p' },
              play_info: {
                type: 1,
                protocol: 'dash',
                label: 'dash_720p',
                url: 'https://example.com/v-720.mp4',
                bandwidth: 1000,
                width: 1280,
                height: 720,
                video_codecs: 'avc1.64001f',
                init_range: '0-100',
                index_range: '101-200',
              },
            },
            {
              meta: { type: 2, label: 'dash_audio', quality_index: 360 },
              play_info: {
                type: 2,
                protocol: 'dash',
                label: 'dash_audio',
                url: 'https://example.com/a.mp4',
                bandwidth: 128000,
                audio_codecs: 'mp4a.40.5',
                audio_sample_rate: 44100,
                init_range: '0-50',
                index_range: '51-90',
              },
            },
          ],
        },
      },
    })

    expect(result.status.media?.dash?.manifestXml).toContain('<AdaptationSet mimeType="video/mp4"')
    expect(result.status.media?.dash?.manifestXml).toContain('<AdaptationSet mimeType="audio/mp4"')
    expect(result.status.media?.dash?.manifestXml).toContain('id="dash_720p"')
    expect(result.status.media?.dash?.manifestXml).toContain('id="dash_audio"')
  })

  it('falls back to progressive when DASH has no audio track', () => {
    const result = adaptStatusDetailResponse({
      idstr: '702',
      text_raw: 'dash video only',
      user: { idstr: '1', screen_name: 'Alice' },
      page_info: {
        object_type: 'video',
        media_info: {
          stream_url: 'https://example.com/fallback-with-audio.mp4',
          mpdInfo: {
            mpdcontent:
              '<?xml version="1.0"?><MPD><Period><AdaptationSet mimeType="video/mp4"><Representation id="dash_720p" /></AdaptationSet></Period></MPD>',
          },
          playback_list: [
            {
              meta: { type: 1, label: 'dash_720p', quality_index: 720, quality_label: '720p' },
              play_info: {
                type: 1,
                protocol: 'dash',
                label: 'dash_720p',
                url: 'https://example.com/v-720.mp4',
              },
            },
          ],
        },
      },
    })

    expect(result.status.media?.streamUrl).toContain('fallback-with-audio.mp4')
    expect(result.status.media?.dash).toBeUndefined()
  })

  it('trusts mpdInfo audio structure over playback_list audio hints', () => {
    const result = adaptStatusDetailResponse({
      idstr: '703',
      text_raw: 'mpd no audio but playback says has audio',
      user: { idstr: '1', screen_name: 'Alice' },
      page_info: {
        object_type: 'video',
        media_info: {
          stream_url: 'https://example.com/fallback.mp4',
          mpdInfo: {
            mpdcontent:
              '<?xml version="1.0"?><MPD><Period><AdaptationSet mimeType="video/mp4"><Representation id="dash_720p" /></AdaptationSet></Period></MPD>',
          },
          playback_list: [
            {
              meta: { type: 1, label: 'dash_720p', quality_index: 720, quality_label: '720p' },
              play_info: {
                type: 1,
                protocol: 'dash',
                label: 'dash_720p',
                url: 'https://example.com/v.mp4',
              },
            },
            {
              meta: { type: 2, label: 'dash_audio', quality_index: 360 },
              play_info: {
                type: 2,
                protocol: 'dash',
                label: 'dash_audio',
                url: 'https://example.com/a.mp4',
              },
            },
          ],
        },
      },
    })

    expect(result.status.media?.streamUrl).toContain('fallback.mp4')
    expect(result.status.media?.dash).toBeUndefined()
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
          like_counts: 3,
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
              like_counts: 1,
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
