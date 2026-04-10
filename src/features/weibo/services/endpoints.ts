export const WEIBO_ENDPOINTS = {
  forYou: '/ajax/feed/unreadfriendstimeline',
  following: '/ajax/feed/friendstimeline',
  sideCards: '/ajax/side/cards',
  statusDetail: '/ajax/statuses/show',
  statusComments: '/ajax/statuses/buildComments',
  statusLongText: '/ajax/statuses/longtext',
  statusConfig: '/ajax/statuses/config',
  commentCreate: '/ajax/comments/create',
  commentReply: '/ajax/comments/reply',
  profileInfo: '/ajax/profile/info',
  profileDetail: '/ajax/profile/detail',
  profilePosts: '/ajax/statuses/mymblog',
  followCreate: '/ajax/friendships/create',
  followDestroy: '/ajax/friendships/destory',
} as const

export type WeiboEndpointKey = keyof typeof WEIBO_ENDPOINTS
export type WeiboEndpointPath = (typeof WEIBO_ENDPOINTS)[WeiboEndpointKey]
