import { describe, expect, it } from 'vitest'

import { adaptSuperTopicResponse } from '@/lib/weibo/data/io/super-topic'

describe('adaptSuperTopicResponse', () => {
  it('normalizes protocol-relative super-topic links', () => {
    const result = adaptSuperTopicResponse({
      data: {
        list: [
          {
            title: '测试超话',
            link: '//weibo.com/p/100808abc',
          },
        ],
      },
    })

    expect(result.items[0]?.link).toBe('https://weibo.com/p/100808abc')
  })

  it('drops unsafe super-topic link schemes', () => {
    const result = adaptSuperTopicResponse({
      data: {
        list: [
          {
            title: '测试超话',
            link: 'javascript:alert(1)',
          },
        ],
      },
    })

    expect(result.items[0]?.link).toBe('')
  })
})
