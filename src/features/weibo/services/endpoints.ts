export const WEIBO_ENDPOINTS = {
  forYou: '/ajax/feed/friendstimeline',
  following: '/ajax/feed/unreadfriendstimeline',
  sideCards: '/ajax/side/cards',
  statusDetail: '/ajax/statuses/show',
  profileInfo: '/ajax/profile/info',
  profilePosts: '/ajax/statuses/mymblog',
} as const

export type WeiboEndpointKey = keyof typeof WEIBO_ENDPOINTS
export type WeiboEndpointPath = (typeof WEIBO_ENDPOINTS)[WeiboEndpointKey]
