import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import {
  loadProfileHoverCard,
  loadProfilePosts,
} from '@/features/weibo/services/weibo-repository'
import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
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

  it('renders the header and posts tab', async () => {
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
    expect(screen.getByRole('tab', { name: '微博' })).toBeInTheDocument()
    expect(await screen.findByText('profile post')).toBeInTheDocument()
    expect(vi.mocked(loadProfileHoverCard)).toHaveBeenCalledWith({ uid: '1' })
    expect(vi.mocked(loadProfilePosts)).toHaveBeenCalledWith('1')
  })
})
