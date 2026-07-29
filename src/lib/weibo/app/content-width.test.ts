import { describe, expect, it } from 'vitest'

import { getContentWidthAdjustedMaxWidth } from '@/lib/weibo/app/content-width'

describe('getContentWidthAdjustedMaxWidth', () => {
  it('keeps the standard width unchanged', () => {
    expect(getContentWidthAdjustedMaxWidth('standard', 720)).toBe('720px')
  })

  it('subtracts a larger interval for the narrow option', () => {
    expect(getContentWidthAdjustedMaxWidth('narrow', 720)).toBe('570px')
  })

  it('adds an extra-narrow option', () => {
    expect(getContentWidthAdjustedMaxWidth('narrower', 720)).toBe('420px')
  })

  it('adds the wide delta to the base width', () => {
    expect(getContentWidthAdjustedMaxWidth('wide', 672)).toBe('822px')
  })

  it('adds the wider delta to the base width', () => {
    expect(getContentWidthAdjustedMaxWidth('wider', 720)).toBe('1020px')
  })

  it('uses the custom width relative to the default custom value', () => {
    expect(getContentWidthAdjustedMaxWidth('custom', 672, 1400)).toBe('872px')
  })
})
