import { describe, expect, it } from 'vitest'

import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'

describe('findWeiboHostRegions', () => {
  it('finds the root region used for takeover', () => {
    document.body.innerHTML = `
      <main>
        <div data-testid="left"></div>
        <div class="woo-box-flex woo-box-alignCenter" data-testid="center"></div>
      </main>
    `

    expect(findWeiboHostRegions(document)?.contentRoot).toBeInstanceOf(HTMLElement)
  })
})
