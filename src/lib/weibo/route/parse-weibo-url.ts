import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'

export function parseWeiboUrl(input: string): WeiboPageDescriptor {
  let url: URL

  try {
    url = new URL(input)
  } catch {
    return { kind: 'unsupported', reason: 'invalid-url' }
  }

  const parts = url.pathname.split('/').filter(Boolean)

  if (parts.length === 0) {
    return { kind: 'home', tab: 'for-you' }
  }

  if (parts.length === 1 && parts[0] === 'mygroups') {
    return { kind: 'home', tab: 'following' }
  }

  if (parts[0] === 'u' && parts[1]) {
    if (parts[1] === 'page' && parts[2] === 'fav' && parts[3]) {
      return {
        kind: 'favorites',
        uid: parts[3],
      }
    }
    return {
      kind: 'profile',
      profileId: parts[1],
      profileSource: 'u',
      tab: 'posts',
    }
  }

  if (parts[0] === 'n' && parts[1]) {
    return {
      kind: 'profile',
      profileId: decodeURIComponent(parts[1]),
      profileSource: 'n',
      tab: 'posts',
    }
  }

  if (parts[0] === 'at' && parts[1] === 'weibo') {
    return {
      kind: 'notifications',
      tab: 'mentions',
    }
  }

  if (parts[0] === 'comment' && parts[1] === 'inbox') {
    return {
      kind: 'notifications',
      tab: 'comments',
    }
  }

  if (parts[0] === 'like' && parts[1] === 'inbox') {
    return {
      kind: 'notifications',
      tab: 'likes',
    }
  }

  if (parts[0] === 'explore') {
    return {
      kind: 'explore',
      groupId: '102803',
    }
  }

  if (parts[0] === 'hot' && parts[1] === 'weibo' && parts[2]) {
    return {
      kind: 'explore',
      groupId: parts[2],
    }
  }

  if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    return {
      kind: 'status',
      authorId: parts[0],
      statusId: parts[1],
    }
  }

  return { kind: 'unsupported', reason: 'unmatched-path' }
}
