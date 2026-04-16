import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatCreatedAt } from './date'

describe('formatCreatedAt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T12:00:00+08:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats same-day timestamps in Weibo timezone', () => {
    expect(formatCreatedAt('Tue Apr 08 10:00:00 +0800 2026')).toBe('10:00')
  })

  it('formats yesterday timestamps in Weibo timezone', () => {
    expect(formatCreatedAt('Tue Apr 07 23:30:00 +0800 2026')).toBe('昨天 23:30')
  })

  it('formats older timestamps with the full date in Weibo timezone', () => {
    expect(formatCreatedAt('Mon Mar 30 09:15:00 +0800 2026')).toBe('2026-03-30 09:15')
  })
})
