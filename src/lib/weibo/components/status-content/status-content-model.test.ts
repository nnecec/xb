import { describe, expect, it } from 'vitest'

import { interpretStatusContent } from './status-content-model'

const phraseMap = {
  '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
}

function interpret(
  overrides: Partial<Parameters<typeof interpretStatusContent>[0]> &
    Pick<Parameters<typeof interpretStatusContent>[0], 'text'>,
) {
  return interpretStatusContent({
    source: {},
    mode: 'plain',
    hideMedia: false,
    renderReplyChain: true,
    collapseReplies: false,
    phraseMap,
    ...overrides,
  })
}

describe('status content model', () => {
  it('classifies url, topic, mention and emoticon tokens before rendering', () => {
    const result = interpret({
      text: '正文 @Alice [赞] #话题# http://t.cn/LINK',
      source: {
        topicEntities: [{ title: '话题', url: '/topic?q=%E8%AF%9D%E9%A2%98' }],
        urlEntities: [
          {
            shortUrl: 'http://t.cn/LINK',
            title: '链接',
            url: 'https://weibo.com/real-link',
          },
        ],
      },
    })

    expect(result).toMatchObject({ kind: 'plain' })
    if (result.kind !== 'plain') return
    expect(result.content.tokens.map((token) => token.kind)).toEqual([
      'text',
      'mention',
      'text',
      'emoticon',
      'text',
      'topic',
      'text',
      'url',
    ])
    expect(result.content.tokens.at(-1)).toMatchObject({
      kind: 'url',
      href: 'https://weibo.com/real-link',
    })
  })

  it('classifies unsafe entity URLs as non-clickable content', () => {
    const result = interpret({
      text: 'http://t.cn/UNSAFE',
      source: {
        urlEntities: [
          { shortUrl: 'http://t.cn/UNSAFE', title: '不安全链接', url: 'javascript:alert(1)' },
        ],
      },
    })

    expect(result).toMatchObject({
      kind: 'plain',
      content: { tokens: [{ kind: 'url', title: '不安全链接', href: null }] },
    })
  })

  it('assigns images in source order and returns a collapse-ready reply chain', () => {
    const leadingImage = {
      id: 'leading-image',
      thumbnailUrl: 'https://example.com/leading-thumb.jpg',
      largeUrl: 'https://example.com/leading.jpg',
    }
    const replyImage = {
      id: 'reply-image',
      thumbnailUrl: 'https://example.com/reply-thumb.jpg',
      largeUrl: 'https://example.com/reply.jpg',
    }
    const result = interpret({
      text: '开头 http://t.cn/LEAD //@A:一 http://t.cn/REPLY //@B:二 //@C:三 //@D:四',
      collapseReplies: true,
      source: {
        imageEntities: {
          'http://t.cn/LEAD': [leadingImage],
          'http://t.cn/REPLY': [replyImage],
        },
      },
    })

    expect(result).toMatchObject({
      kind: 'reply-chain',
      leading: { text: '开头', images: [{ id: 'leading-image' }] },
      chain: {
        kind: 'collapsed',
        head: [
          { index: 0, screenName: 'A', content: { text: '一', images: [{ id: 'reply-image' }] } },
          { index: 1, screenName: 'B' },
        ],
        middle: [{ index: 2, screenName: 'C' }],
        tail: { index: 3, screenName: 'D' },
      },
    })
  })

  it('falls back to one plain block when reply markers are malformed', () => {
    const text = '主文本 //@坏格式 //@Alice:有效'
    const result = interpret({ text })
    expect(result).toMatchObject({ kind: 'plain', content: { text } })
  })

  it('sanitizes markdown-only host markup in the interpretation result', () => {
    const result = interpret({
      text: '原始文本',
      mode: 'markdown',
      source: {
        isMarkdown: true,
        markdownText:
          '# 标题<script>alert(1)</script><style>.x{}</style><span class="expand">展开</span>',
      },
    })
    expect(result).toEqual({ kind: 'markdown', text: '# 标题' })
  })

  it('keeps image tokens as text and suppresses emoticon interpretation when media is hidden', () => {
    const result = interpret({
      text: '图 http://t.cn/IMAGE [赞]',
      hideMedia: true,
      source: {
        imageEntities: {
          'http://t.cn/IMAGE': [
            {
              id: 'image',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              largeUrl: 'https://example.com/image.jpg',
            },
          ],
        },
      },
    })

    expect(result).toMatchObject({
      kind: 'plain',
      content: { text: '图 http://t.cn/IMAGE [赞]', images: [] },
    })
    if (result.kind !== 'plain') return
    expect(result.content.tokens.some((token) => token.kind === 'emoticon')).toBe(false)
  })
})
