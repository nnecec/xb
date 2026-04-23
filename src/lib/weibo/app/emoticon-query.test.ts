import { describe, expect, it } from 'vitest'

import {
  EMOTICON_CONFIG_QUERY_KEY,
  emoticonConfigQueryOptions,
} from '@/lib/weibo/app/emoticon-query'

describe('emoticonConfigQueryOptions', () => {
  it('uses a stable query key and infinite cache semantics', () => {
    const options = emoticonConfigQueryOptions()

    expect(EMOTICON_CONFIG_QUERY_KEY).toEqual(['weibo', 'emoticon-config'])
    expect(options.queryKey).toEqual(['weibo', 'emoticon-config'])
    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(Infinity)
  })
})
