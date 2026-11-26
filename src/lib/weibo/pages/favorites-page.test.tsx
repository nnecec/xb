import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { PageRuntimeProvider, type PageRuntime } from '@/lib/weibo/app/page-runtime'
import { FavoritesPage } from '@/lib/weibo/pages/favorites-page'

const scrollToTop = vi.fn()

vi.mock('@/lib/weibo/components/infinite-feed-list', () => ({
  InfiniteFeedList: () => <div>收藏列表</div>,
}))

vi.mock('@/lib/weibo/data/weibo-data', () => ({
  favoritesInfiniteOptions: () => ({
    queryKey: ['weibo', 'favorites', '1001'],
    queryFn: async () => ({ items: [], nextCursor: null }),
    initialPageParam: null,
    getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor,
  }),
}))

function renderFavorites(queryClient: QueryClient) {
  const runtime: PageRuntime = {
    page: { kind: 'favorites', uid: '1001' },
    navigationMode: 'browser',
    scrollRootRef: { current: document.createElement('div') },
    navigate: vi.fn(),
    openStatus: vi.fn(),
    canGoBack: false,
    back: vi.fn(),
    resetScroll: vi.fn(),
    scrollToTop,
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <PageRuntimeProvider runtime={runtime}>
        <FavoritesPage />
      </PageRuntimeProvider>
    </QueryClientProvider>,
  )
}

describe('FavoritesPage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({ ...store.getState(), isHydrated: true })
  })

  it('does not jump to the top when a favorite cache update refetches the list', async () => {
    scrollToTop.mockClear()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['weibo', 'favorites', '1001'], {
      pages: [{ items: [{ id: 'status-1' }], nextCursor: null }],
      pageParams: [null],
    })

    function InvalidateFavorites() {
      useEffect(() => {
        void queryClient.invalidateQueries({ queryKey: ['weibo', 'favorites'] })
      }, [])
      return null
    }

    const view = renderFavorites(queryClient)
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <PageRuntimeProvider
          runtime={{
            page: { kind: 'favorites', uid: '1001' },
            navigationMode: 'browser',
            scrollRootRef: { current: document.createElement('div') },
            navigate: vi.fn(),
            openStatus: vi.fn(),
            canGoBack: false,
            back: vi.fn(),
            resetScroll: vi.fn(),
            scrollToTop,
          }}
        >
          <FavoritesPage />
          <InvalidateFavorites />
        </PageRuntimeProvider>
      </QueryClientProvider>,
    )

    await vi.waitFor(() => {
      expect(queryClient.isFetching({ queryKey: ['weibo', 'favorites'] })).toBe(0)
    })
    expect(scrollToTop).not.toHaveBeenCalled()
  })
})
