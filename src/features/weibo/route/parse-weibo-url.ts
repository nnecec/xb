import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'

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

  if (parts[0] === 'u' && parts[1]) {
    return {
      kind: 'profile',
      profileId: parts[1],
      profileSource: 'u',
      tab: 'posts',
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
