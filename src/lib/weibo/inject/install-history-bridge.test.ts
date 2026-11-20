import { afterEach, describe, expect, it } from 'vitest'

import { installHistoryBridge } from '@/lib/weibo/inject/install-history-bridge'

const nativePushState = History.prototype.pushState
const nativeReplaceState = History.prototype.replaceState

describe('installHistoryBridge', () => {
  afterEach(() => {
    history.pushState = nativePushState
    history.replaceState = nativeReplaceState
    history.replaceState({}, '', '/')
  })

  it('blocks replaceState that changes URL after popstate', async () => {
    installHistoryBridge(window)

    // Navigate to /topic?q=test so there's something to go back from
    history.pushState({}, '', '/topic?q=test')
    history.pushState({}, '', '/123/456')

    // Go back — wait for popstate to fire
    const popstatePromise = new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true })
    })
    history.back()
    await popstatePromise

    // The host SPA (e.g. Vue Router) tries replaceState to /topic.
    // This should be blocked because it differs from the popstate URL.
    history.replaceState({}, '', '/topic')

    // URL should still be /topic?q=test (the popstate URL)
    expect(window.location.pathname + window.location.search).toBe('/topic?q=test')
  })

  it('allows replaceState that keeps the same URL after popstate', async () => {
    installHistoryBridge(window)

    history.pushState({}, '', '/topic?q=test')
    history.pushState({}, '', '/123/456')

    const popstatePromise = new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true })
    })
    history.back()
    await popstatePromise

    // replaceState to the same URL should be allowed
    history.replaceState({ extra: true }, '', '/topic?q=test')
    expect(window.location.pathname + window.location.search).toBe('/topic?q=test')
  })

  it('keeps the topic query when the host rewrites /topic immediately', () => {
    installHistoryBridge(window)

    history.pushState({}, '', '/topic?q=%E6%B5%8B%E8%AF%95')
    history.replaceState({}, '', '/topic')
    history.pushState({}, '', '/topic')

    expect(window.location.pathname + window.location.search).toBe('/topic?q=%E6%B5%8B%E8%AF%95')
  })

  it('still allows leaving a topic page for another xb route', () => {
    installHistoryBridge(window)

    history.pushState({}, '', '/topic?q=test')
    history.pushState({}, '', '/u/42')

    expect(window.location.pathname).toBe('/u/42')
  })
})
