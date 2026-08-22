import { createContext, type ReactNode, type RefObject, useContext } from 'react'
import type { NavigateFunction, NavigateOptions } from 'react-router'

import type { StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'

export interface PageRuntime {
  page: WeiboPageDescriptor
  navigationMode: 'browser' | 'column'
  scrollRootRef: RefObject<HTMLDivElement | null>
  navigate: (to: string, options?: NavigateOptions) => void
  openStatus: (item: StatusDetailNavigationItem) => void
  back: () => void
  resetScroll: () => void
  scrollToTop: () => void
}

interface BrowserPageRuntimeInput {
  page: WeiboPageDescriptor
  navigate: NavigateFunction
  scrollRootRef: RefObject<HTMLDivElement | null>
}

export function createBrowserPageRuntime({
  page,
  navigate,
  scrollRootRef,
}: BrowserPageRuntimeInput): PageRuntime {
  return {
    page,
    navigationMode: 'browser',
    scrollRootRef,
    navigate: (to, options) => navigate(to, options),
    openStatus(item) {
      const statusId = item.mblogId ?? item.id
      if (item.author.id && statusId) {
        navigate(`/${item.author.id}/${statusId}`)
      }
    },
    back: () => {
      if (window.history.length > 2) {
        navigate(-1)
      } else {
        window.location.href = 'https://weibo.com'
      }
    },
    resetScroll() {
      if (scrollRootRef.current) {
        scrollRootRef.current.scrollTop = 0
      }
    },
    scrollToTop() {
      scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    },
  }
}

const PageRuntimeContext = createContext<PageRuntime | null>(null)

export function PageRuntimeProvider({
  children,
  runtime,
}: {
  children: ReactNode
  runtime: PageRuntime
}) {
  return <PageRuntimeContext.Provider value={runtime}>{children}</PageRuntimeContext.Provider>
}

export function usePageRuntime(): PageRuntime {
  const runtime = useContext(PageRuntimeContext)
  if (!runtime) {
    throw new Error('页面内容必须位于 PageRuntimeProvider 内')
  }
  return runtime
}
