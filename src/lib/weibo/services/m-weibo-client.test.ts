import { afterEach, describe, expect, it, vi } from 'vitest'

import { detectMweiboCaptcha, mweiboFetch } from '@/lib/weibo/services/m-weibo-client'
import { MweiboCaptchaError, MweiboUnavailableError } from '@/lib/weibo/services/mweibo-errors'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('detectMweiboCaptcha', () => {
  it('returns the captcha URL when ok=-100 and url contains /captcha/', () => {
    expect(
      detectMweiboCaptcha({
        ok: -100,
        errno: '-100',
        msg: '',
        url: 'https://m.weibo.cn/captcha/show?backUrl=',
        extra: '',
      }),
    ).toBe('https://m.weibo.cn/captcha/show?backUrl=')
  })

  it('returns null when ok is normal (1)', () => {
    expect(detectMweiboCaptcha({ ok: 1, data: {} })).toBeNull()
  })

  it('returns null when ok is -100 but url is missing', () => {
    expect(detectMweiboCaptcha({ ok: -100, errno: '-100' })).toBeNull()
  })

  it('returns null when ok is -100 but url is not a captcha link', () => {
    expect(detectMweiboCaptcha({ ok: -100, url: 'https://m.weibo.cn/something' })).toBeNull()
  })

  it('returns null for null or non-object inputs', () => {
    expect(detectMweiboCaptcha(null)).toBeNull()
    expect(detectMweiboCaptcha('string')).toBeNull()
    expect(detectMweiboCaptcha(42)).toBeNull()
    expect(detectMweiboCaptcha(undefined)).toBeNull()
  })
})

describe('MweiboCaptchaError', () => {
  it('exposes captchaUrl, kind, and the right name', () => {
    const err = new MweiboCaptchaError('https://m.weibo.cn/captcha/show?x=1')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(MweiboCaptchaError)
    expect(err.kind).toBe('mweibo-captcha')
    expect(err.captchaUrl).toBe('https://m.weibo.cn/captcha/show?x=1')
    expect(err.name).toBe('MweiboCaptchaError')
  })
})

describe('mweiboFetch', () => {
  function installSendMessage(...responses: unknown[]) {
    const sendMessage = vi.fn()
    for (const response of responses) {
      sendMessage.mockResolvedValueOnce(response)
    }
    vi.stubGlobal('browser', { runtime: { sendMessage } })
    return sendMessage
  }

  it('returns successful JSON data through the background proxy', async () => {
    const sendMessage = installSendMessage(undefined, {
      ok: true,
      data: { ok: 1, data: { cards: [] } },
      status: 200,
      contentType: 'application/json',
    })

    await expect(mweiboFetch('https://m.weibo.cn/api/test')).resolves.toEqual({
      ok: 1,
      data: { cards: [] },
    })
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'mweibo-fetch',
      url: 'https://m.weibo.cn/api/test',
    })
  })

  it('surfaces captcha responses without retrying', async () => {
    const sendMessage = installSendMessage(undefined, {
      ok: true,
      data: {
        ok: -100,
        url: 'https://m.weibo.cn/captcha/show?backUrl=',
      },
    })

    await expect(mweiboFetch('https://m.weibo.cn/api/test')).rejects.toBeInstanceOf(
      MweiboCaptchaError,
    )
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })

  it.each([
    [
      'unexpected-content',
      {
        ok: false,
        error: 'mweibo-fetch-unexpected-content',
        status: 200,
        contentType: 'text/html',
      },
    ],
    [
      'http',
      {
        ok: false,
        error: 'mweibo-fetch-failed:403',
        status: 403,
        contentType: 'application/json',
      },
    ],
  ] as const)(
    'classifies %s failures as unavailable without retrying',
    async (reason, response) => {
      const sendMessage = installSendMessage(undefined, response)

      const request = mweiboFetch('https://m.weibo.cn/api/test')
      await expect(request).rejects.toMatchObject({
        name: 'MweiboUnavailableError',
        reason,
        status: response.status,
        contentType: response.contentType,
      })
      await expect(request).rejects.toBeInstanceOf(MweiboUnavailableError)
      expect(sendMessage).toHaveBeenCalledTimes(2)
    },
  )
})
