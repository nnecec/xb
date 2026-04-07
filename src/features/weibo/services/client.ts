const DEFAULT_TIMEOUT_MS = 8000

export async function fetchWeiboJson<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path, window.location.origin)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

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
  finally {
    window.clearTimeout(timeoutId)
  }
}
