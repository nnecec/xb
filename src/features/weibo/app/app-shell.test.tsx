import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
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
    loadProfileInfo: vi.fn(),
    loadProfilePosts: vi.fn(),
    loadStatusDetail: vi.fn(),
    loadStatusComments: vi.fn(),
  }
})

describe('AppShell', () => {
  beforeEach(() => {
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
        <AppShell page={{ kind: 'home', tab: 'for-you' }} />
      </QueryClientProvider>,
    )

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Following' }))

    await waitFor(() => {
      expect(getAppSettingsStore().getState().homeTimelineTab).toBe('following')
    })
  })
})
