import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MweiboCaptchaError, MweiboUnavailableError } from '@/lib/weibo/services/mweibo-errors'

import { deliverMweiboTopicPage, getMweiboTopicRecoveryState } from './mweibo-topic-delivery'

const { mweiboFetchMock } = vi.hoisted(() => ({
  mweiboFetchMock: vi.fn(),
}))

vi.mock('@/lib/weibo/services/m-weibo-client', () => ({
  mweiboFetch: mweiboFetchMock,
}))

function successPayload(text: string, id: string) {
  return {
    ok: 1,
    data: {
      cardlistInfo: { total: 1, page: 1, page_size: 10 },
      cards: [
        {
          card_type: 9,
          mblog: {
            id,
            isLongText: true,
            text,
            user: { id: 42, screen_name: 'Alice' },
          },
        },
      ],
    },
  }
}

async function recoveryFrom(request: Promise<unknown>) {
  try {
    await request
    throw new Error('expected topic delivery to fail')
  } catch (error) {
    return getMweiboTopicRecoveryState(error)
  }
}

describe('Mweibo topic delivery', () => {
  beforeEach(() => {
    mweiboFetchMock.mockReset()
  })

  it('builds the transport URL and returns a normalized empty timeline page', async () => {
    mweiboFetchMock.mockResolvedValue({
      ok: 1,
      data: {
        cardlistInfo: { total: 0, page: 2, page_size: 10 },
        cards: [],
      },
    })

    await expect(deliverMweiboTopicPage('测试话题', 2, '60')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
    const url = new URL(mweiboFetchMock.mock.calls[0]?.[0] as string)
    expect(url.pathname).toBe('/api/container/getIndex')
    expect(url.searchParams.get('containerid')).toBe('231522type=60&q=#测试话题#')
    expect(url.searchParams.get('page_type')).toBe('searchall')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it.each([
    ['忙着看直播 ...全文', '忙着看直播 ...'],
    ['话题页长文预览 ...<a href="/status/502">全文</a>', '话题页长文预览 ...'],
  ])('normalizes topic long-text previews', async (text, expected) => {
    mweiboFetchMock.mockResolvedValue(successPayload(text, '501'))

    const result = await deliverMweiboTopicPage('测试话题', 1)
    expect(result.items[0]?.text).toBe(expected)
    expect(result.items[0]?.isLongText).toBe(true)
  })

  it.each([{ ok: 0 }, { ok: -100 }, { ok: 1 }, null])(
    'classifies invalid business payloads as a stable unavailable recovery state',
    async (payload) => {
      mweiboFetchMock.mockResolvedValue(payload)

      const recovery = await recoveryFrom(deliverMweiboTopicPage('测试话题', 1, '60'))
      expect(recovery).toMatchObject({
        kind: 'unavailable',
        reason: 'business',
      })
      const originalUrl = new URL(recovery?.originalTopicUrl ?? '')
      expect(originalUrl.pathname).toBe('/search')
      expect(originalUrl.searchParams.get('containerid')).toBe('231522type=60&q=#测试话题#')
    },
  )

  it('normalizes captcha transport errors to the same recovery seam', async () => {
    mweiboFetchMock.mockRejectedValue(
      new MweiboCaptchaError('https://m.weibo.cn/captcha/show?backUrl='),
    )

    await expect(recoveryFrom(deliverMweiboTopicPage('测试话题', 1))).resolves.toMatchObject({
      kind: 'captcha',
    })
  })

  it.each(['http', 'unexpected-content'] as const)(
    'normalizes %s transport errors without leaking transport classes',
    async (reason) => {
      mweiboFetchMock.mockRejectedValue(new MweiboUnavailableError(reason))

      await expect(recoveryFrom(deliverMweiboTopicPage('测试话题', 1))).resolves.toMatchObject({
        kind: 'unavailable',
        reason,
      })
    },
  )

  it('leaves unrelated failures to the query error boundary', async () => {
    const error = new Error('extension runtime disconnected')
    mweiboFetchMock.mockRejectedValue(error)

    await expect(deliverMweiboTopicPage('测试话题', 1)).rejects.toBe(error)
  })
})
