import axios from 'axios'

const DEFAULT_TIMEOUT_MS = 10000

export type WeiboQueryParams = Record<string, string | number | null | undefined>

const weiboClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export async function fetchWeiboJson<T>(
  path: string,
  params: WeiboQueryParams = {},
): Promise<T> {
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

export async function postWeiboForm<T>(
  path: string,
  data: Record<string, string>,
): Promise<T> {
  try {
    const response = await weiboClient.post<T>(path, new URLSearchParams(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
