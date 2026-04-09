import { describe, expect, it } from 'vitest'

import {
  applyPageTakeover,
  clearPageTakeover,
} from '@/features/weibo/content/page-takeover'

describe('applyPageTakeover', () => {
  it('marks the original host app root as hidden and restores it', () => {
    const node = document.createElement('div')
    node.style.display = 'grid'

    applyPageTakeover(node)

    expect(node.getAttribute('data-xb-hidden')).toBe('true')
    expect(node.getAttribute('aria-hidden')).toBe('true')
    expect(node.style.display).toBe('none')

    clearPageTakeover(node)

    expect(node.hasAttribute('data-xb-hidden')).toBe(false)
    expect(node.hasAttribute('aria-hidden')).toBe(false)
    expect(node.style.display).toBe('grid')
  })
})
