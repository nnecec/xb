import { describe, expect, it } from 'vitest'

import { adaptStatusDetailResponse } from '@/features/weibo/services/adapters/status'

describe('adaptStatusDetailResponse', () => {
  it('returns a main status and replies list', () => {
    const result = adaptStatusDetailResponse({
      idstr: '501',
      text_raw: 'main post',
      created_at: 'today',
      user: { idstr: '1', screen_name: 'Alice' },
      comments: [
        {
          idstr: '601',
          text_raw: 'reply',
          created_at: 'today',
          user: { idstr: '2', screen_name: 'Bob' },
        },
      ],
    })

    expect(result.status.id).toBe('501')
    expect(result.replies).toHaveLength(1)
  })
})
