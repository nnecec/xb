import { describe, expect, it } from 'vitest'

import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'

describe('findWeiboHostRegions', () => {
  it('prefers the full host app root for takeover', () => {
    document.body.innerHTML = `
      <div id="app">
        <header data-testid="header"></header>
        <main data-testid="mainCore">
          <div class="woo-box-flex woo-box-alignCenter" data-testid="center"></div>
        </main>
      </div>
    `

    expect(findWeiboHostRegions(document)?.appRoot).toBe(
      document.querySelector('#app'),
    )
  })

  it('falls back to the content root parent when the app id is unavailable', () => {
    document.body.innerHTML = `
      <section data-testid="shell">
        <main>
          <div data-testid="center"></div>
        </main>
      </section>
    `

    expect(findWeiboHostRegions(document)?.appRoot).toBe(
      document.querySelector('[data-testid="shell"]'),
    )
  })
})
