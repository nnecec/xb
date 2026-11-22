type HistoryMethod = 'pushState' | 'replaceState'

/**
 * Weibo's Vue Router does not recognise `/topic?q=<name>` and rewrites it to
 * `/topic`, both right after navigation and after popstate. Dropping `q`
 * makes xb treat the page as unsupported and hand it back to Weibo.
 * The guard keeps that query in place. The popstate window also blocks any
 * other immediate rewrite, so React Router reads the URL it navigated to.
 *
 * Crucially, the popstate listener is registered with capture:true so it
 * fires BEFORE the host page's listeners (which are registered at page load
 * time, before this script runs). Without capture, our listener would fire
 * after the host's, and the guard would not be active when the host calls
 * replaceState.
 */
function isTopicQueryRewrite(currentHref: string, nextHref: string) {
  const current = new URL(currentHref)
  const next = new URL(nextHref)
  return (
    current.origin === next.origin &&
    current.pathname === '/topic' &&
    next.pathname === '/topic' &&
    current.searchParams.has('q') &&
    !next.searchParams.has('q')
  )
}

export function installHistoryBridge(targetWindow: Window) {
  let popstateHref: string | null = null

  const wrapHistoryMethod = (method: HistoryMethod) => {
    const original = targetWindow.history[method]

    Object.defineProperty(targetWindow.history, method, {
      configurable: true,
      writable: true,
      value: function patchedHistoryMethod(
        this: History,
        ...args: Parameters<History[HistoryMethod]>
      ) {
        if (args[2] != null) {
          try {
            const resolved = new URL(String(args[2]), targetWindow.location.href).href
            if (popstateHref !== null && resolved !== popstateHref) return
            if (isTopicQueryRewrite(targetWindow.location.href, resolved)) return
          } catch {
            // invalid URL — let it through
          }
        }
        const result = original.apply(this, args)
        return result
      },
    })
  }

  wrapHistoryMethod('pushState')
  wrapHistoryMethod('replaceState')

  // capture:true ensures this fires before the host page's popstate handlers
  targetWindow.addEventListener(
    'popstate',
    () => {
      popstateHref = targetWindow.location.href
      setTimeout(() => {
        popstateHref = null
      }, 50)
    },
    true,
  )
}
