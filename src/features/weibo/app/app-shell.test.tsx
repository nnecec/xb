import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
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

vi.mock('@/features/weibo/app/app-shell-panels', () => ({
  HomeStatusPanels: ({
    onHomeTabChange,
    onStatusComment,
  }: {
    onHomeTabChange: (tab: 'for-you' | 'following') => void
    onStatusComment?: (target: {
      kind: 'status'
      mode: 'comment'
      statusId: string
      targetCommentId: null
      authorName: string
      excerpt: string
    }) => void
  }) => (
    <div>
      <button role="tab" type="button" onMouseDown={() => onHomeTabChange('following')}>
        Following
      </button>
      <button
        type="button"
        onClick={() =>
          onStatusComment?.({
            kind: 'status',
            mode: 'comment',
            statusId: '501',
            targetCommentId: null,
            authorName: 'Alice',
            excerpt: 'main post',
          })
        }
      >
        回复微博
      </button>
    </div>
  ),
  ProfilePanel: () => null,
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
      bio: null,
      avatarUrl: null,
      bannerUrl: null,
      followersCount: null,
      friendsCount: null,
      ipLocation: null,
      descText: null,
      createdAt: null,
      mutualFollowers: [],
      mutualFollowerTotal: null,
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
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Following' }))

    await waitFor(() => {
      expect(vi.mocked(loadHomeTimeline)).toHaveBeenLastCalledWith('following', { cursor: null })
    })
  })

  it('does not trigger status queries on profile pages', async () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/u/1969776354']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )

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
    const queryClient = new QueryClient()

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

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/1/501']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(loadStatusDetail).toHaveBeenCalledTimes(1)
      expect(loadStatusComments).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '回复微博' })[0]!)
    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '太酷了[色]' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(submitComposeAction).toHaveBeenCalled()
    })

    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('回复成功')
    })
  })
})
