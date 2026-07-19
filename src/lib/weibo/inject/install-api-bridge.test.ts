import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, isAxiosError } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  isAxiosError: vi.fn((error: unknown) =>
    Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
  ),
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({ get, post }),
    isAxiosError,
  },
}))

import { installApiBridge } from '@/lib/weibo/inject/install-api-bridge'
import {
  API_REQUEST_EVENT,
  API_RESPONSE_EVENT,
  API_UNAUTHORIZED_EVENT,
  XB_SOURCE,
} from '@/lib/weibo/platform/messages'

function dispatchApiRequest(data: Record<string, unknown>) {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: window,
      data,
    }),
  )
}

describe('installApiBridge', () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    isAxiosError.mockClear()
    postMessageSpy = vi.spyOn(window, 'postMessage')
    installApiBridge(window)
  })

  afterEach(() => {
    postMessageSpy.mockRestore()
  })

  it('ignores messages that are not api requests', async () => {
    dispatchApiRequest({ source: 'other', type: API_REQUEST_EVENT })
    await Promise.resolve()
    expect(get).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  it('handles GET requests and posts the response', async () => {
    get.mockResolvedValueOnce({ data: { ok: true } })

    dispatchApiRequest({
      source: XB_SOURCE,
      type: API_REQUEST_EVENT,
      id: 'req-get-1',
      method: 'get',
      path: '/ajax/feed/friendstimeline',
      params: { page: 1 },
    })

    await vi.waitFor(() => {
      expect(get).toHaveBeenCalledWith('/ajax/feed/friendstimeline', {
        params: { page: 1 },
      })
    })

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: XB_SOURCE,
          type: API_RESPONSE_EVENT,
          id: 'req-get-1',
          data: { ok: true },
        }),
        '*',
      )
    })
  })

  it('handles POST requests with form body', async () => {
    post.mockResolvedValueOnce({ data: { ok: true } })
    document.cookie = 'XSRF-TOKEN=token%2D1'

    dispatchApiRequest({
      source: XB_SOURCE,
      type: API_REQUEST_EVENT,
      id: 'req-post-1',
      method: 'post',
      path: '/ajax/statuses/update',
      body: { content: 'hello' },
    })

    await vi.waitFor(() => {
      expect(post).toHaveBeenCalled()
    })

    const [path, body, config] = post.mock.calls[0]!
    expect(path).toBe('/ajax/statuses/update')
    expect(body).toBeInstanceOf(URLSearchParams)
    expect(String(body)).toContain('content=hello')
    expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
  })

  it('posts unauthorized for 401 axios errors', async () => {
    isAxiosError.mockReturnValue(true)
    get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { message: 'auth required' } },
      message: 'Request failed',
    })

    dispatchApiRequest({
      source: XB_SOURCE,
      type: API_REQUEST_EVENT,
      id: 'req-401',
      method: 'get',
      path: '/ajax/statuses/show',
    })

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: XB_SOURCE,
          type: API_UNAUTHORIZED_EVENT,
        }),
        '*',
      )
    })

    await vi.waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: XB_SOURCE,
          type: API_RESPONSE_EVENT,
          id: 'req-401',
          error: expect.objectContaining({ status: 401 }),
        }),
        '*',
      )
    })
  })
})
