import { describe, expect, it } from 'vitest'

import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'

describe('parseWeiboUrl', () => {
  it('parses the home timeline', () => {
    expect(parseWeiboUrl('https://weibo.com/')).toEqual({
      kind: 'home',
      tab: 'for-you',
    })
  })

  it('parses the following timeline', () => {
    expect(parseWeiboUrl('https://weibo.com/mygroups')).toEqual({
      kind: 'home',
      tab: 'following',
    })
  })

  it('parses a status detail URL', () => {
    expect(parseWeiboUrl('https://weibo.com/1969776354/PiR8A7d0z')).toEqual({
      kind: 'status',
      authorId: '1969776354',
      statusId: 'PiR8A7d0z',
    })
  })

  it('parses a profile URL', () => {
    expect(parseWeiboUrl('https://weibo.com/u/1969776354')).toEqual({
      kind: 'profile',
      profileId: '1969776354',
      profileSource: 'u',
      tab: 'posts',
    })
  })

  it('parses a nickname profile URL (/n/screenName)', () => {
    expect(parseWeiboUrl('https://weibo.com/n/AIMIKKKK')).toEqual({
      kind: 'profile',
      profileId: 'AIMIKKKK',
      profileSource: 'n',
      tab: 'posts',
    })
  })

  it('parses a favorites URL', () => {
    expect(parseWeiboUrl('https://weibo.com/u/page/fav/1969776354')).toEqual({
      kind: 'favorites',
      uid: '1969776354',
    })
  })

  it('returns unsupported for unknown paths', () => {
    expect(parseWeiboUrl('https://weibo.com/settings')).toEqual({
      kind: 'unsupported',
      reason: 'unmatched-path',
    })
  })
})
