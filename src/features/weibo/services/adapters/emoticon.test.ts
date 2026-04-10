import { describe, expect, it } from 'vitest'

import { adaptEmoticonConfigResponse } from '@/features/weibo/services/adapters/emoticon'

describe('adaptEmoticonConfigResponse', () => {
  it('keeps groups and builds a phrase lookup map', () => {
    expect(
      adaptEmoticonConfigResponse({
        emoticon: {
          ZH_CN: {
            PC热门表情: [
              {
                phrase: '[赞]',
                url: 'https://face.t.sinajs.cn/zan.png',
              },
              {
                phrase: '[泪奔]',
                url: 'https://face.t.sinajs.cn/leiben.png',
              },
            ],
            其他: [
              {
                phrase: '[心]',
                url: 'https://face.t.sinajs.cn/xin.png',
              },
              {
                phrase: '',
                url: 'https://face.t.sinajs.cn/invalid.png',
              },
              {
                phrase: '[赞]',
                url: 'https://face.t.sinajs.cn/zan-latest.png',
              },
            ],
          },
        },
      }),
    ).toEqual({
      groups: [
        {
          title: 'PC热门表情',
          items: [
            { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
            { phrase: '[泪奔]', url: 'https://face.t.sinajs.cn/leiben.png' },
          ],
        },
        {
          title: '其他',
          items: [
            { phrase: '[心]', url: 'https://face.t.sinajs.cn/xin.png' },
            { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan-latest.png' },
          ],
        },
      ],
      phraseMap: {
        '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan-latest.png' },
        '[泪奔]': { phrase: '[泪奔]', url: 'https://face.t.sinajs.cn/leiben.png' },
        '[心]': { phrase: '[心]', url: 'https://face.t.sinajs.cn/xin.png' },
      },
    })
  })

  it('normalizes missing locale data to empty collections', () => {
    expect(adaptEmoticonConfigResponse({})).toEqual({
      groups: [],
      phraseMap: {},
    })
  })

  it('unwraps payloads that put groups under data.emoticon', () => {
    expect(
      adaptEmoticonConfigResponse({
        data: {
          emoticon: {
            默认: [
              {
                phrase: '[二哈]',
                url: 'https://face.t.sinajs.cn/erha.png',
              },
            ],
          },
        },
      }),
    ).toEqual({
      groups: [
        {
          title: '默认',
          items: [{ phrase: '[二哈]', url: 'https://face.t.sinajs.cn/erha.png' }],
        },
      ],
      phraseMap: {
        '[二哈]': { phrase: '[二哈]', url: 'https://face.t.sinajs.cn/erha.png' },
      },
    })
  })

  it('falls back to the first locale key when ZH_CN is absent', () => {
    expect(
      adaptEmoticonConfigResponse({
        emoticon: {
          EN_US: {
            Default: [
              {
                phrase: '[doge]',
                url: 'https://face.t.sinajs.cn/doge.png',
              },
            ],
          },
        },
      }),
    ).toEqual({
      groups: [
        {
          title: 'Default',
          items: [{ phrase: '[doge]', url: 'https://face.t.sinajs.cn/doge.png' }],
        },
      ],
      phraseMap: {
        '[doge]': { phrase: '[doge]', url: 'https://face.t.sinajs.cn/doge.png' },
      },
    })
  })
})
