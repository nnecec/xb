import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { isRouteChangeMessage } from '@/features/weibo/platform/messages'

/**
 * Keeps React Router in sync when the host page (or our own navigations) updates
 * history via pushState/replaceState — mirrored by the main-world history bridge.
 */
export function WeiboHistorySync() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef('')
  pathRef.current = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isRouteChangeMessage(event.data)) {
        return
      }
      let url: URL
      try {
        url = new URL(event.data.href)
      } catch {
        return
      }
      const incoming = `${url.pathname}${url.search}${url.hash}`
      if (incoming === pathRef.current) {
        return
      }
      navigate(incoming, { replace: true })
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate])

  return null
}
