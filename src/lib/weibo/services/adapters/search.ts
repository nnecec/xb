export interface SearchHotQueryItem {
  suggestion: string
  count: number
  discuss: number
  discuss_arae: number
  discuss_num: number
  top_flag: number
  topic_flag: number
  type: number
}

export interface SearchUserItem {
  uid: string
  idstr: string
  screen_name: string
  name: string
  location: string
  description: string
  profile_image_url: string
  followers_count: number
  followers_count_str: string
  following: boolean
  verified: boolean
  verified_type: number
  verified_reason: string
  follow_me: boolean
  followers: number
  friends: number
  statuses: number
  favourities: number
  avatar_large: string
  cover_image_phone: string
}

export interface SearchPayload {
  ok: number
  data?: {
    hotquery?: SearchHotQueryItem[]
    history?: string[]
    real_hot?: unknown[]
    query_relates?: unknown[]
    user?: SearchUserItem
    users?: SearchUserItem[]
  }
}

export interface SearchResult {
  hotQueries: SearchHotQueryItem[]
  users: SearchUserItem[]
}

export function adaptSearchResponse(payload: SearchPayload): SearchResult {
  return {
    hotQueries: payload.data?.hotquery ?? [],
    users: payload.data?.users ?? [],
  }
}
