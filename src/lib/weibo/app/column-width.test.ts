import { describe, expect, it } from 'vitest'

import { resolveColumnWidthPx } from '@/lib/weibo/app/column-width'

describe('resolveColumnWidthPx', () => {
  it('maps designed presets onto column pixels', () => {
    expect(resolveColumnWidthPx('narrower', 600)).toBe(520)
    expect(resolveColumnWidthPx('narrow', 600)).toBe(560)
    expect(resolveColumnWidthPx('standard', 600)).toBe(600)
    expect(resolveColumnWidthPx('wide', 600)).toBe(660)
    expect(resolveColumnWidthPx('wider', 600)).toBe(720)
  })

  it('uses the custom width when that preset is selected', () => {
    expect(resolveColumnWidthPx('custom', 500)).toBe(500)
  })
})
