import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { NavigationRail } from '@/lib/weibo/components/navigation-rail'

const getCurrentUserUidMock = vi.fn<() => string | null>()
const checkUnreadNotificationsMock = vi.fn()

vi.mock('@/lib/weibo/platform/current-user', () => ({
  getCurrentUserUid: () => getCurrentUserUidMock(),
}))

vi.mock('@/lib/weibo/data/weibo-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/weibo/data/weibo-io')>()
  return {
    ...actual,
    checkUnreadNotifications: () => checkUnreadNotificationsMock(),
  }
})

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('NavigationRail', () => {
  beforeEach(() => {
    getCurrentUserUidMock.mockReset()
    getCurrentUserUidMock.mockReturnValue('1001')
    checkUnreadNotificationsMock.mockReset()
    checkUnreadNotificationsMock.mockResolvedValue({
      mentions: 0,
      comments: 0,
      likes: 0,
      dm: 0,
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
    mockMatchMedia(false)
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      homeTab: 'for-you',
      isHydrated: true,
    })
  })
  afterEach(() => {
    cleanup()
  })

  function renderNavigationRail({
    pageKind = 'home',
    viewingProfileUserId = null,
    rewriteEnabled = false,
  }: {
    pageKind?: 'home' | 'profile' | 'status' | 'unsupported'
    viewingProfileUserId?: string | null
    rewriteEnabled?: boolean
  } = {}) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme="system"
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            onSidebarCollapsedChange={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('renders an accessible navigation landmark', () => {
    renderNavigationRail()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
  })

  it('marks active items through aria-current', () => {
    renderNavigationRail()
    expect(screen.getByRole('button', { name: '主页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '我的' })).not.toHaveAttribute('aria-current')
  })

  it('marks profile as active when viewing current user profile', () => {
    renderNavigationRail({ pageKind: 'profile', viewingProfileUserId: '1001' })
    expect(screen.getByRole('button', { name: '我的' })).toHaveAttribute('aria-current', 'page')
  })

  it('uses fallback profile target when current user id is missing', () => {
    getCurrentUserUidMock.mockReturnValue(null)
    renderNavigationRail()
    expect(screen.getByRole('button', { name: '我的' })).toBeInTheDocument()
  })

  it('does not render the old card description text', () => {
    renderNavigationRail()
    expect(screen.queryByText('随时随地发现新鲜事')).not.toBeInTheDocument()
  })

  it('exposes rewrite toggle state through aria-pressed', () => {
    renderNavigationRail({ rewriteEnabled: true })
    expect(screen.getByRole('button', { name: '切换 xb 重写' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('uses expanded bottom control width without relying on the CSS xl breakpoint', () => {
    mockMatchMedia(true)
    renderNavigationRail()

    const rewriteLabel = screen.getByText('返回原模式')
    expect(rewriteLabel.parentElement).toHaveClass('justify-between')
    expect(rewriteLabel.parentElement?.parentElement).toHaveClass('w-[180px]')
  })

  it('does not poll unread counts when notifications and DMs are hidden', async () => {
    getAppSettingsStore().setState({
      ...getAppSettingsStore().getState(),
      showNotifications: false,
      showDMs: false,
    })

    renderNavigationRail()

    await waitFor(() => {
      expect(checkUnreadNotificationsMock).not.toHaveBeenCalled()
    })
  })

  it('polls unread counts when either notification entry point is visible', async () => {
    getAppSettingsStore().setState({
      ...getAppSettingsStore().getState(),
      showNotifications: false,
      showDMs: true,
    })

    renderNavigationRail()

    await waitFor(() => {
      expect(checkUnreadNotificationsMock).toHaveBeenCalledTimes(1)
    })
  })
})
