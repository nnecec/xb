import { describe, expect, it } from 'vitest'

import { adaptStatusDetailResponse } from '@/features/weibo/services/adapters/status'

describe('adaptStatusDetailResponse', () => {
  it('returns normalized main status', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: 'main post',
      created_at: 'today',
      user: { idstr: '1', screen_name: 'Alice' },
    })

    expect(result.status.id).toBe('501')
    expect(result.status.images).toEqual([])
  })
})
