import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'

export function useWeiboPage() {
  const { pathname, search } = useLocation()

  return useMemo(
    () => parseWeiboUrl(new URL(`${pathname}${search}`, window.location.origin).href),
    [pathname, search],
  )
}
