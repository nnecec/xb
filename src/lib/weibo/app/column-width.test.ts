import { describe, expect, it } from 'vitest'

import { resolveColumnWidthPx } from '@/lib/weibo/app/column-width'

describe('resolveColumnWidthPx', () => {
  it('maps designed presets onto column pixels', () => {
    expect(resolveColumnWidthPx('narrower', 420)).toBe(340)
    expect(resolveColumnWidthPx('narrow', 420)).toBe(380)
    expect(resolveColumnWidthPx('standard', 420)).toBe(420)
    expect(resolveColumnWidthPx('wide', 420)).toBe(480)
    expect(resolveColumnWidthPx('wider', 420)).toBe(560)
  })

  it('uses the custom width when that preset is selected', () => {
    expect(resolveColumnWidthPx('custom', 500)).toBe(500)
  })
})
