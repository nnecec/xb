import axios from 'axios'

const DEFAULT_TIMEOUT_MS = 10000

export type WeiboQueryParams = Record<string, string | number | null | undefined>

function readXsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  if (!match?.[1]) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const weiboClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export async function wbGet<T>(path: string, params: WeiboQueryParams = {}): Promise<T> {
  try {
    const response = await weiboClient.get<T>(path, { params })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('weibo-request-timeout')
      }

      const status = error.response?.status
      if (status) {
        throw new Error(`weibo-request-failed:${status}`)
      }
    }

    throw error
  }
}

export async function wbPostForm<T>(path: string, data: Record<string, string>): Promise<T> {
  try {
    const xsrf = readXsrfTokenFromCookie()
    const response = await weiboClient.post<T>(path, new URLSearchParams(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      },
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('weibo-request-timeout')
      }

      const status = error.response?.status
      if (status) {
        throw new Error(`weibo-request-failed:${status}`)
      }
    }

    throw error
  }
}
