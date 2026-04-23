import '@/lib/weibo/content/weibo-anti-flash.css'

/**
 * Hides Weibo's native UI until the React app is ready.
 * For s.weibo.com (search), CSS overrides handle the rebrand directly —
 * this script only hides unwanted chrome outside #pl_feedlist_index.
 */
export default defineContentScript({
  matches: ['https://weibo.com/*', 'https://www.weibo.com/*', 'https://s.weibo.com/*'],
  runAt: 'document_start',
  main() {
    const style = document.createElement('style')
    style.textContent = /* css */ `
      body { visibility: hidden !important; }
      /* Non-search pages: reveal #app once ready */
      html[data-xb-weibo-ready] body,
      html[data-xb-weibo-ready] #app { visibility: visible !important; }
      /* Search pages: reveal #pl_feed_main (contains #pl_feedlist_index) */
      // html[data-xb-weibo-ready] .wbs-feed { visibility: visible !important; }
    `
    document.head.append(style)
  },
})
