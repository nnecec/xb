import { describe, expect, it } from 'vitest'

import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'

describe('parseWeiboUrl', () => {
  it('parses the home timeline', () => {
    expect(parseWeiboUrl('https://weibo.com/')).toEqual({
      kind: 'home',
      tab: 'for-you',
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

  it('returns unsupported for unknown paths', () => {
    expect(parseWeiboUrl('https://weibo.com/settings')).toEqual({
      kind: 'unsupported',
      reason: 'unmatched-path',
    })
  })
})
