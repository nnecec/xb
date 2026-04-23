import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import { HomeTimelinePage } from '@/lib/weibo/pages/home-timeline-page'
import { loadHomeTimeline } from '@/lib/weibo/services/weibo-repository'

vi.mock('@/lib/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/services/weibo-repository')>(
    '@/lib/weibo/services/weibo-repository',
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
  }
})

describe('HomeTimelinePage', () => {
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

  it('renders tabs and feed cards', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route index element={<HomeTimelinePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('tab', { name: '推荐' })).toBeInTheDocument()
    expect(await screen.findByText('hello world')).toBeInTheDocument()
    expect(vi.mocked(loadHomeTimeline)).toHaveBeenCalled()
  })
})
