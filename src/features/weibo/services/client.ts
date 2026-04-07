const DEFAULT_TIMEOUT_MS = 8000

export type WeiboQueryParams = Record<string, string | number | null | undefined>

function appendQueryParams(url: URL, params: WeiboQueryParams): void {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
}

export async function fetchWeiboJson<T>(
  path: string,
  params: WeiboQueryParams = {},
): Promise<T> {
  const url = new URL(path, window.location.origin)
  appendQueryParams(url, params)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`weibo-request-failed:${response.status}`)
    }

    return await response.json() as T
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('weibo-request-timeout')
    }

    throw error
  }
  finally {
    window.clearTimeout(timeoutId)
  }
}
