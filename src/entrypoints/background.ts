import { defineBackground } from 'wxt/utils/define-background'

export default defineBackground(() => {
  void ensureMediaRequestHeaderRules()

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'mweibo-fetch') {
      handleMweiboFetch(message as MweiboFetchMessage)
        .then(sendResponse)
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        })
      return true // async sendResponse
    }

    if (message?.type === 'media-head') {
      handleMediaHead(message as MediaHeadMessage, getMediaReferrer(sender.url))
        .then(sendResponse)
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        })
      return true
    }

    if (message?.type === 'media-fetch') {
      handleMediaFetch(message as MediaFetchMessage, getMediaReferrer(sender.url))
        .then(sendResponse)
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        })
      return true
    }
  })
})

// ─── m.weibo.cn fetch ───

interface MweiboFetchMessage {
  type: 'mweibo-fetch'
  url: string
}

interface MweiboFetchResponse {
  ok: boolean
  data?: unknown
  error?: string
}

export function assertAllowedMweiboFetchUrl(url: string): void {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'm.weibo.cn') {
    throw new Error('unsupported-mweibo-url')
  }

  const allowed =
    parsed.pathname === '/api/remind/unread' ||
    (parsed.pathname === '/api/container/getIndex' &&
      parsed.searchParams.get('page_type') === 'searchall')

  if (!allowed) {
    throw new Error('unsupported-mweibo-endpoint')
  }
}

async function handleMweiboFetch(message: MweiboFetchMessage): Promise<MweiboFetchResponse> {
  assertAllowedMweiboFetchUrl(message.url)

  const xsrfCookie = await browser.cookies.get({
    url: 'https://m.weibo.cn',
    name: 'XSRF-TOKEN',
  })

  const headers: Record<string, string> = {
    'x-requested-with': 'XMLHttpRequest',
    accept: 'application/json, text/plain, */*',
    ...(xsrfCookie?.value ? { 'x-xsrf-token': xsrfCookie.value } : {}),
  }

  const response = await fetch(message.url, {
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    return {
      ok: false,
      error: `mweibo-fetch-failed:${response.status}`,
    }
  }

  const data = await response.json()
  return { ok: true, data }
}

// ─── media fetch proxy ───

interface MediaHeadMessage {
  type: 'media-head'
  url: string
}

interface MediaHeadResponse {
  ok: boolean
  size?: number
  error?: string
}

interface MediaFetchMessage {
  type: 'media-fetch'
  url: string
}

interface MediaFetchResponse {
  ok: boolean
  data?: string
  contentType?: string
  error?: string
}

const allowedMediaHostSuffixes = ['sinaimg.cn', 'sinajs.cn', 'weibocdn.com']
export const maxBackgroundMediaBytes = 150 * 1024 * 1024
const mediaRequestHeaderRuleId = 10_401
const backgroundRequestTabId = -1

let mediaRequestHeaderRulesPromise: Promise<void> | null = null

export function createMediaRequestHeaderRule(): Browser.declarativeNetRequest.Rule {
  return {
    id: mediaRequestHeaderRuleId,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'referer',
          operation: 'set',
          value: 'https://weibo.com/',
        },
        {
          header: 'Origin',
          operation: 'remove',
        },
      ],
    },
    condition: {
      regexFilter: '^https://[^/]+\\.(sinaimg\\.cn|sinajs\\.cn|weibocdn\\.com)/',
      resourceTypes: ['xmlhttprequest'],
      tabIds: [backgroundRequestTabId],
    },
  }
}

async function ensureMediaRequestHeaderRules(): Promise<void> {
  if (!mediaRequestHeaderRulesPromise) {
    mediaRequestHeaderRulesPromise = installMediaRequestHeaderRules()
  }

  await mediaRequestHeaderRulesPromise
}

async function installMediaRequestHeaderRules(): Promise<void> {
  if (!browser.declarativeNetRequest?.updateSessionRules) return

  try {
    await browser.declarativeNetRequest.updateDynamicRules?.({
      removeRuleIds: [mediaRequestHeaderRuleId],
    })
  } catch (error) {
    console.warn('清理旧媒体下载动态请求头规则失败', error)
  }

  try {
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [mediaRequestHeaderRuleId],
      addRules: [createMediaRequestHeaderRule()],
    })
  } catch (error) {
    console.warn('安装媒体下载请求头规则失败', error)
  }
}

function getMediaReferrer(senderUrl: string | undefined): string {
  if (!senderUrl) return 'https://weibo.com/'

  try {
    const parsed = new URL(senderUrl)
    const isWeiboPage =
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'weibo.com' || parsed.hostname === 'www.weibo.com')

    if (isWeiboPage) {
      return `${parsed.origin}/`
    }
  } catch {
    // Fall back to the canonical Weibo origin below.
  }

  return 'https://weibo.com/'
}

function isAllowedMediaHost(hostname: string): boolean {
  return allowedMediaHostSuffixes.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  )
}

export function assertAllowedMediaUrl(url: string): void {
  const parsed = new URL(url)

  if (parsed.protocol !== 'https:') {
    throw new Error('unsupported-media-url')
  }

  if (!isAllowedMediaHost(parsed.hostname)) {
    throw new Error('unsupported-media-host')
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
  }

  return btoa(chunks.join(''))
}

function getMediaRequestInit(
  referrer: string,
): Pick<RequestInit, 'credentials' | 'headers' | 'referrer' | 'referrerPolicy'> {
  return {
    credentials: 'include',
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*',
    },
    referrer,
    referrerPolicy: 'unsafe-url',
  }
}

function isMediaContentType(contentType: string | null): contentType is string {
  return (
    contentType?.startsWith('image/') === true ||
    contentType?.startsWith('video/') === true ||
    contentType === 'application/octet-stream'
  )
}

function getMediaContentType(response: Response): string | null {
  return response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() || null
}

function getResponseContentLength(response: Response): number | null {
  const value = response.headers.get('content-length')
  if (!value) return null

  const size = Number.parseInt(value, 10)
  return Number.isFinite(size) && size >= 0 ? size : null
}

function concatenateChunks(chunks: Uint8Array[], totalLength: number): ArrayBuffer {
  const bytes = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes.buffer
}

async function readArrayBufferWithLimit(
  response: Response,
): Promise<{ ok: true; data: ArrayBuffer } | { ok: false; error: string }> {
  const contentLength = getResponseContentLength(response)

  if (contentLength !== null && contentLength > maxBackgroundMediaBytes) {
    return { ok: false, error: 'media-fetch-too-large' }
  }

  if (!response.body) {
    if (contentLength === null) {
      return { ok: false, error: 'media-fetch-size-unknown' }
    }

    const data = await response.arrayBuffer()
    return data.byteLength > maxBackgroundMediaBytes
      ? { ok: false, error: 'media-fetch-too-large' }
      : { ok: true, data }
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalLength += value.byteLength
      if (totalLength > maxBackgroundMediaBytes) {
        await reader.cancel()
        return { ok: false, error: 'media-fetch-too-large' }
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return { ok: true, data: concatenateChunks(chunks, totalLength) }
}

export async function handleMediaHead(
  message: MediaHeadMessage,
  referrer: string,
): Promise<MediaHeadResponse> {
  assertAllowedMediaUrl(message.url)
  await ensureMediaRequestHeaderRules()

  const response = await fetch(message.url, {
    ...getMediaRequestInit(referrer),
    method: 'HEAD',
  })

  if (!response.ok) {
    return {
      ok: false,
      error: `media-head-failed:${response.status}`,
    }
  }

  if (!isMediaContentType(getMediaContentType(response))) {
    return {
      ok: false,
      error: 'unsupported-media-content-type',
    }
  }

  return {
    ok: true,
    size: Number.parseInt(response.headers.get('content-length') || '0', 10),
  }
}

export async function handleMediaFetch(
  message: MediaFetchMessage,
  referrer: string,
): Promise<MediaFetchResponse> {
  assertAllowedMediaUrl(message.url)
  await ensureMediaRequestHeaderRules()

  const response = await fetch(message.url, getMediaRequestInit(referrer))

  if (!response.ok) {
    return {
      ok: false,
      error: `media-fetch-failed:${response.status}`,
    }
  }

  const contentType = getMediaContentType(response)
  if (!isMediaContentType(contentType)) {
    return {
      ok: false,
      error: 'unsupported-media-content-type',
    }
  }
  const mediaContentType = contentType

  const data = await readArrayBufferWithLimit(response)
  if (!data.ok) {
    return data
  }

  return {
    ok: true,
    contentType: mediaContentType,
    data: arrayBufferToBase64(data.data),
  }
}
