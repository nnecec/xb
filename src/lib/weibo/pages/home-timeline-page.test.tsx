import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import { loadFollowGroups, loadGroupTimeline, loadHomeTimeline } from '@/lib/weibo/data/weibo-io'
import { HomeTimelinePage } from '@/lib/weibo/pages/home-timeline-page'

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    loadHomeTimeline: vi.fn(async () => ({
      items: [
        {
          id: '501',
          isLongText: false,
          mblogId: null,
          text: 'hello world',
          createdAt: '2024-01-01',
          createdAtLabel: 'just now',
          author: { id: '1', name: 'Alice', avatarUrl: null },
          stats: { likes: 7, comments: 3, reposts: 1 },
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: null,
    })),
    loadFollowGroups: vi.fn(async () => ({
      groups: [],
      defaultGroups: {
        specialFollow: { gid: 'special-dynamic', title: '特别关注' },
        friendCircle: { gid: 'friend-dynamic', title: '互相关注' },
      },
    })),
    loadGroupTimeline: vi.fn(async () => ({
      items: [],
      nextCursor: null,
    })),
  }
})

describe('HomeTimelinePage', () => {
  let scrollToMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    scrollToMock = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollToMock,
    })
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      theme: 'system',
      rewriteEnabled: true,
      isHydrated: true,
    })
  })

  it('renders the timeline top bar and feed cards', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route index element={<HomeTimelinePage />} />
              <Route path="mygroups" element={<HomeTimelinePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('button', { name: '推荐' })).toBeInTheDocument()
    expect(await screen.findByText('hello world')).toBeInTheDocument()
    expect(vi.mocked(loadHomeTimeline)).toHaveBeenCalled()
  })

  it('maps default group gids from the URL to special timeline tabs', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/mygroups?gid=special-dynamic']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route path="mygroups" element={<HomeTimelinePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('button', { name: '特别关注' })).toBeInTheDocument()

    await waitFor(() => {
      expect(vi.mocked(loadGroupTimeline)).toHaveBeenCalledWith('special-dynamic', {
        cursor: null,
      })
    })
    expect(vi.mocked(loadFollowGroups)).toHaveBeenCalled()
  })

  it('shows the new posts indicator and refreshes on refresh button click', async () => {
    let timelineRequestCount = 0
    let resolveRefresh: ((value: Awaited<ReturnType<typeof loadHomeTimeline>>) => void) | undefined
    const refreshPromise = new Promise<Awaited<ReturnType<typeof loadHomeTimeline>>>((resolve) => {
      resolveRefresh = resolve
    })

    vi.mocked(loadHomeTimeline).mockImplementation(async (_tab, options) => {
      if (!options) {
        return {
          items: [
            {
              id: '502',
              isLongText: false,
              mblogId: null,
              text: 'fresh post',
              createdAt: '2024-01-02',
              createdAtLabel: 'just now',
              author: { id: '2', name: 'Bob', avatarUrl: null },
              stats: { likes: 0, comments: 0, reposts: 0 },
              images: [],
              media: null,
              regionName: '',
              source: '',
            },
            {
              id: '501',
              isLongText: false,
              mblogId: null,
              text: 'old post',
              createdAt: '2024-01-01',
              createdAtLabel: 'just now',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 7, comments: 3, reposts: 1 },
              images: [],
              media: null,
              regionName: '',
              source: '',
            },
          ],
          nextCursor: null,
        }
      }

      timelineRequestCount += 1
      if (timelineRequestCount > 1) {
        return refreshPromise
      }

      return {
        items: [
          {
            id: '501',
            isLongText: false,
            mblogId: null,
            text: 'old post',
            createdAt: '2024-01-01',
            createdAtLabel: 'just now',
            author: { id: '1', name: 'Alice', avatarUrl: null },
            stats: { likes: 7, comments: 3, reposts: 1 },
            images: [],
            media: null,
            regionName: '',
            source: '',
          },
        ],
        nextCursor: null,
      }
    })

    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/mygroups']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route path="mygroups" element={<HomeTimelinePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('1条新微博')).toBeInTheDocument()

    const refreshButton = screen.getAllByRole('button', { name: '刷新' })[0]!
    fireEvent.click(refreshButton)

    expect(timelineRequestCount).toBe(2)
    // Refetch is in flight — the page must NOT have scrolled yet.
    expect(scrollToMock).not.toHaveBeenCalled()

    resolveRefresh?.({
      items: [],
      nextCursor: null,
    })

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
    queryClient.clear()
  })
})
