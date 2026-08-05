/**
 * Errors thrown by the m.weibo.cn fetch layer.
 */

/**
 * Thrown by `mweiboFetch` when m.weibo.cn returns its captcha interceptor
 * response ({"ok":-100,"errno":"-100","url":"https://m.weibo.cn/captcha/show?backUrl="}).
 *
 * Pages that consume `mweiboFetch` should catch this and surface a friendly
 * prompt that guides the user to complete the captcha at m.weibo.cn.
 */
export class MweiboCaptchaError extends Error {
  readonly kind = 'mweibo-captcha' as const
  readonly captchaUrl: string

  constructor(captchaUrl: string) {
    super(`m.weibo.cn captcha required: ${captchaUrl}`)
    this.name = 'MweiboCaptchaError'
    this.captchaUrl = captchaUrl
  }
}

export type MweiboUnavailableReason = 'business' | 'http' | 'unexpected-content'

/**
 * Thrown when m.weibo.cn returns a response that cannot be used as topic data.
 * The reason is intentionally small and safe to surface in diagnostics.
 */
export class MweiboUnavailableError extends Error {
  readonly kind = 'mweibo-unavailable' as const
  readonly reason: MweiboUnavailableReason
  readonly status?: number
  readonly contentType?: string

  constructor(
    reason: MweiboUnavailableReason,
    details: { status?: number; contentType?: string } = {},
  ) {
    super('m.weibo.cn 暂时没有返回可用的话题内容')
    this.name = 'MweiboUnavailableError'
    this.reason = reason
    this.status = details.status
    this.contentType = details.contentType
  }
}
