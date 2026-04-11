import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import {
  loadProfileHoverCard,
  loadHomeTimeline,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
  submitComposeAction,
} from '@/features/weibo/services/weibo-repository'
import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/features/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: () => null,
}))

vi.mock('@/features/weibo/components/comment-modal', () => ({
  CommentModal: ({
    open,
    target,
    onSubmit,
  }: {
    open: boolean
    target: unknown
    onSubmit: (payload: { text: string; alsoSecondaryAction: boolean }) => void
  }) =>
    open && target ? (
      <div role="dialog" aria-label="回复微博">
        <button
          type="button"
          onClick={() => onSubmit({ text: '太酷了', alsoSecondaryAction: false })}
        >
          发送
        </button>
      </div>
    ) : null,
}))

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadHomeTimeline: vi.fn(async () => ({
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
    submitComposeAction: vi.fn(async () => {}),
  }
})

function renderWeiboShell(initialEntries: string[]) {
  const queryClient = new QueryClient()
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

    fireEvent.mouseDown(screen.getByRole('tab', { name: '我关注的' }))

    await waitFor(() => {
      expect(vi.mocked(loadHomeTimeline)).toHaveBeenLastCalledWith('following', { cursor: null })
    })
  })

  it('does not trigger status queries on profile pages', async () => {
    renderWeiboShell(['/u/1969776354'])

    await waitFor(() => {
      expect(vi.mocked(loadProfileHoverCard)).toHaveBeenCalledWith({ uid: '1969776354' })
    })

    await waitFor(() => {
      expect(vi.mocked(loadProfilePosts)).toHaveBeenCalledWith('1969776354')
    })

    expect(vi.mocked(loadStatusDetail)).not.toHaveBeenCalled()
    expect(vi.mocked(loadStatusComments)).not.toHaveBeenCalled()
  })

  it('refetches detail queries after a successful status-detail reply', async () => {
    vi.mocked(loadStatusDetail).mockResolvedValue({
      status: {
        id: '501',
        mblogId: '501',
        isLongText: false,
        text: 'main post',
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
    vi.mocked(submitComposeAction).mockResolvedValue()

    const { queryClient } = renderWeiboShell(['/1/501'])
    // Real invalidation waits for all matching refetches; keep this case focused on compose + toast.
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)

    await waitFor(() => {
      expect(loadStatusDetail).toHaveBeenCalledTimes(1)
      expect(loadStatusComments).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '回复微博' })[0]!)
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '回复微博' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(submitComposeAction).toHaveBeenCalled()
    })

    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('回复成功')
    })

    expect(screen.queryByRole('textbox', { name: '回复内容' })).not.toBeInTheDocument()
  })
})
