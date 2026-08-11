import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import {
  loadFollowGroups,
  loadGroupTimeline,
  loadProfileHoverCard,
  loadHomeTimeline,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
} from '@/lib/weibo/data/weibo-io'
import { HomeTimelinePage } from '@/lib/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/lib/weibo/pages/profile-page'
import { StatusDetailPage } from '@/lib/weibo/pages/status-detail-page'

vi.mock('@/lib/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: () => null,
}))

vi.mock('@/lib/weibo/components/comment-modal', () => ({
  CommentModal: ({ open, target }: { open: boolean; target: unknown }) =>
    open && target ? <div role="dialog" aria-label="回复微博" /> : null,
}))

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    loadHomeTimeline: vi.fn(async () => ({
      items: [],
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
    loadProfileHoverCard: vi.fn(async () => ({
      id: '1969776354',
      name: 'Alice',
      bio: '',
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
      items: [],
      nextCursor: null,
    })),
    loadStatusDetail: vi.fn(),
    loadStatusComments: vi.fn(),
  }
})

let activeQueryClient: QueryClient | undefined

function renderWeiboShell(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  activeQueryClient = queryClient
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="*" element={<AppShell />}>
              <Route index element={<HomeTimelinePage />} />
              <Route path="mygroups" element={<HomeTimelinePage />} />
              <Route path=":authorId/:statusId" element={<StatusDetailPage />} />
              <Route path="u/:uid" element={<ProfilePage />} />
              <Route path="n/:uname" element={<ProfilePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('AppShell', () => {
  afterEach(() => {
    activeQueryClient?.clear()
    activeQueryClient = undefined
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    resetAppSettingsStoreForTest()
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

  it('navigates to the following timeline when the home tab changes', async () => {
    renderWeiboShell(['/'])

    fireEvent.pointerDown(screen.getByRole('button', { name: '推荐' }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(await screen.findByRole('menuitem', { name: '我关注的' }))

    await waitFor(() => {
      expect(vi.mocked(loadHomeTimeline)).toHaveBeenLastCalledWith('following', { cursor: null })
    })
  })

  it('navigates to the special-follow timeline with the gid from allGroups', async () => {
    renderWeiboShell(['/'])

    fireEvent.pointerDown(screen.getByRole('button', { name: '推荐' }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(await screen.findByRole('menuitem', { name: '特别关注' }))

    await waitFor(() => {
      expect(vi.mocked(loadFollowGroups)).toHaveBeenCalled()
      expect(vi.mocked(loadGroupTimeline)).toHaveBeenCalledWith('special-dynamic', {
        cursor: null,
      })
    })
  })

  it('does not trigger status queries on profile pages', async () => {
    renderWeiboShell(['/u/1969776354'])

    await waitFor(() => {
      expect(vi.mocked(loadProfileHoverCard)).toHaveBeenCalledWith({ uid: '1969776354' })
    })

    await waitFor(() => {
      expect(vi.mocked(loadProfilePosts)).toHaveBeenCalledWith('1969776354', 1)
    })

    expect(vi.mocked(loadStatusDetail)).not.toHaveBeenCalled()
    expect(vi.mocked(loadStatusComments)).not.toHaveBeenCalled()
  })

  it('opens the compose modal from a status-detail reply action', async () => {
    vi.mocked(loadStatusDetail).mockResolvedValue({
      status: {
        id: '501',
        mblogId: '501',
        isLongText: false,
        text: 'main post',
        createdAt: '2024-01-01',
        createdAtLabel: 'today',
        author: { id: '1', name: 'Alice', avatarUrl: null },
        stats: { likes: 1, comments: 1, reposts: 0 },
        images: [],
        media: null,
        regionName: '',
        source: '',
      },
    })
    vi.mocked(loadStatusComments).mockResolvedValue({
      items: [],
      nextCursor: null,
    })

    renderWeiboShell(['/1/501'])

    await waitFor(() => {
      expect(loadStatusDetail).toHaveBeenCalledTimes(1)
      expect(loadStatusComments).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /^回复微博，/ })[0]!)
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '回复微博' })).toBeInTheDocument()
    })
  })
})
