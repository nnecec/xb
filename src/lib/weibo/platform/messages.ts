export const XB_SOURCE = 'xb'
export const API_REQUEST_EVENT = 'api-request'
export const API_RESPONSE_EVENT = 'api-response'
export const API_UNAUTHORIZED_EVENT = 'api-unauthorized'

export interface ApiRequestMessage {
  source: typeof XB_SOURCE
  type: typeof API_REQUEST_EVENT
  id: string
  method: 'get' | 'post'
  path: string
  params?: Record<string, string | number | null | undefined>
  body?: Record<string, string>
}

export interface ApiResponseMessage {
  source: typeof XB_SOURCE
  type: typeof API_RESPONSE_EVENT
  id: string
  data?: unknown
  error?: { status?: number; message?: string }
}

export interface ApiUnauthorizedMessage {
  source: typeof XB_SOURCE
  type: typeof API_UNAUTHORIZED_EVENT
}

export interface MweiboFetchResponse {
  ok: boolean
  data?: unknown
  error?: string
  status?: number
  contentType?: string
}

export function isApiRequestMessage(value: unknown): value is ApiRequestMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ApiRequestMessage).source === XB_SOURCE &&
    (value as ApiRequestMessage).type === API_REQUEST_EVENT &&
    typeof (value as ApiRequestMessage).id === 'string' &&
    ((value as ApiRequestMessage).method === 'get' ||
      (value as ApiRequestMessage).method === 'post') &&
    typeof (value as ApiRequestMessage).path === 'string'
  )
}

export function isApiResponseMessage(value: unknown): value is ApiResponseMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ApiResponseMessage).source === XB_SOURCE &&
    (value as ApiResponseMessage).type === API_RESPONSE_EVENT &&
    typeof (value as ApiResponseMessage).id === 'string'
  )
}

export function isApiUnauthorizedMessage(value: unknown): value is ApiUnauthorizedMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ApiUnauthorizedMessage).source === XB_SOURCE &&
    (value as ApiUnauthorizedMessage).type === API_UNAUTHORIZED_EVENT
  )
}
