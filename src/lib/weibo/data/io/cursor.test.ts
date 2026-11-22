import { describe, expect, it } from 'vitest'

import { normalizeCursor } from '@/lib/weibo/data/io/cursor'

describe('normalizeCursor', () => {
  it('把空游标和 0 收成没有下一页', () => {
    expect(normalizeCursor(undefined)).toBeNull()
    expect(normalizeCursor(null)).toBeNull()
    expect(normalizeCursor('')).toBeNull()
    expect(normalizeCursor(0)).toBeNull()
    expect(normalizeCursor('0')).toBeNull()
    expect(normalizeCursor(123)).toBe('123')
    expect(normalizeCursor('next')).toBe('next')
  })
})
