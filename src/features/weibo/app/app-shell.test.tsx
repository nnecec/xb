import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
import {
  loadProfileHoverCard,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
} from '@/features/weibo/services/weibo-repository'
import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'

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
  }
})

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })

    store.setState({
      ...store.getState(),
      theme: 'system',
      rewriteEnabled: true,
      homeTimelineTab: 'for-you',
      isHydrated: true,
    })
  })

  it('writes the selected home timeline tab into the global settings store', async () => {
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
      expect(getAppSettingsStore().getState().homeTimelineTab).toBe('following')
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
})
