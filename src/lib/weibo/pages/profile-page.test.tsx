import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import {
  loadProfileHoverCard,
  loadProfilePosts,
  loadProfileSearchPosts,
} from '@/lib/weibo/data/weibo-io'
import { ProfilePage } from '@/lib/weibo/pages/profile-page'

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    loadProfileHoverCard: vi.fn(async () => ({
      id: '1',
      name: 'Alice',
      bio: 'bio',
      avatarUrl: null,
      bannerUrl: null,
      followersCount: null,
      friendsCount: null,
      ipLocation: null,
      descText: null,
      createdAt: null,
      mutualFollowers: [],
      mutualFollowerTotal: null,
      following: false,
      followMe: false,
    })),
    loadProfilePosts: vi.fn(async () => ({
      items: [
        {
          id: '501',
          isLongText: false,
          mblogId: null,
          text: 'profile post',
          createdAtLabel: 'today',
          author: { id: '1', name: 'Alice', avatarUrl: null },
          stats: { likes: 1, comments: 1, reposts: 0 },
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: null,
    })),
    loadProfileSearchPosts: vi.fn(async () => ({
      items: [
        {
          id: '601',
          isLongText: false,
          mblogId: null,
          text: 'search post',
          createdAtLabel: 'today',
          author: { id: '1', name: 'Alice', avatarUrl: null },
          stats: { likes: 1, comments: 1, reposts: 0 },
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      ],
      nextCursor: null,
      total: '1',
      matchedQuery: '烧鸡',
    })),
  }
})

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('renders the header, search bar, and posts feed', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/u/1']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route path="u/:uid" element={<ProfilePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索 TA 的微博')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '微博' })).not.toBeInTheDocument()
    expect(await screen.findByText('profile post')).toBeInTheDocument()
    expect(vi.mocked(loadProfileHoverCard)).toHaveBeenCalledWith({ uid: '1' })
    expect(vi.mocked(loadProfilePosts)).toHaveBeenCalledWith('1', 1)
  })

  it('loads profile search when q is present in the URL', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/u/1?q=%E7%83%A7%E9%B8%A1&endtime=1780848000']}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route path="u/:uid" element={<ProfilePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('search post')).toBeInTheDocument()
    expect(await screen.findByText('已检索 1 条')).toBeInTheDocument()
    expect(vi.mocked(loadProfileSearchPosts)).toHaveBeenCalledWith(
      '1',
      {
        query: '烧鸡',
        starttime: null,
        endtime: 1780848000,
        filters: {
          hasori: true,
          hasret: true,
          hastext: true,
          haspic: true,
          hasvideo: true,
          hasmusic: true,
        },
      },
      1,
    )
  })
})
