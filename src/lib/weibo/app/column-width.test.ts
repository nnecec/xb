import { describe, expect, it } from 'vitest'

import { resolveColumnWidthPx } from '@/lib/weibo/app/column-width'

describe('resolveColumnWidthPx', () => {
  it('maps designed presets onto column pixels', () => {
    expect(resolveColumnWidthPx('narrower', 480)).toBe(400)
    expect(resolveColumnWidthPx('narrow', 480)).toBe(440)
    expect(resolveColumnWidthPx('standard', 480)).toBe(480)
    expect(resolveColumnWidthPx('wide', 480)).toBe(540)
    expect(resolveColumnWidthPx('wider', 480)).toBe(620)
  })

  it('uses the custom width when that preset is selected', () => {
    expect(resolveColumnWidthPx('custom', 500)).toBe(500)
  })
})
