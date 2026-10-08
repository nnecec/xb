import { renderHook } from '@testing-library/react'
import { createRef, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  createBrowserPageRuntime,
  PageRuntimeProvider,
  usePageRuntime,
} from '@/lib/weibo/app/page-runtime'

describe('page runtime', () => {
  it('maps status navigation, browser back and scrolling behind one interface', () => {
    const navigate = vi.fn()
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3)
    const scrollRootRef = createRef<HTMLDivElement>()
    const scrollTo = vi.fn()
    scrollRootRef.current = { scrollTop: 36, scrollTo } as unknown as HTMLDivElement
    const runtime = createBrowserPageRuntime({
      navigate,
      page: { kind: 'home', tab: 'for-you' },
      getScrollRoot: () => scrollRootRef.current,
    })

    runtime.openStatus({
      id: 'fallback-id',
      mblogId: 'status-id',
      author: { id: 'author-id' },
    } as never)
    runtime.back()
    runtime.resetScroll()
    runtime.scrollToTop()

    expect(navigate).toHaveBeenNthCalledWith(1, '/author-id/status-id')
    expect(navigate).toHaveBeenNthCalledWith(2, -1)
    expect(scrollRootRef.current.scrollTop).toBe(0)
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('provides a page runtime independently from the application shell context', () => {
    const runtime = createBrowserPageRuntime({
      navigate: vi.fn(),
      page: { kind: 'explore', groupId: '102803' },
      getScrollRoot: () => null,
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PageRuntimeProvider runtime={runtime}>{children}</PageRuntimeProvider>
    )

    const { result } = renderHook(() => usePageRuntime(), { wrapper })

    expect(result.current.page).toEqual({ kind: 'explore', groupId: '102803' })
    expect(result.current.navigationMode).toBe('browser')
  })
})
