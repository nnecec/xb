import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import type { AppShellContext } from '@/lib/weibo/app/app-shell'
import { ShellFrame } from '@/lib/weibo/app/app-shell-layout'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

vi.mock('@/lib/weibo/components/right-rail', () => ({
  RightRail: () => <div data-testid="right-rail">right rail</div>,
}))

vi.mock('@/lib/app-settings-store', () => {
  const noop = vi.fn()
  return {
    useAppSettings: (selector: (s: Record<string, unknown>) => unknown) => {
      const state = {
        backgroundEnabled: true,
        backgroundColor: '#1e40af',
        backgroundImageUrl: 'https://bing.img.run/1920x1080.php',
        glassOpacity: 80,
        glassBlur: 12,
        setBackgroundEnabled: noop,
        setBackgroundColor: noop,
        setBackgroundImageUrl: noop,
        setGlassOpacity: noop,
        setGlassBlur: noop,
      }
      return selector(state)
    },
    getAppSettingsStore: vi.fn(),
    resetAppSettingsStoreForTest: vi.fn(),
  }
})

vi.mock('@/components/ui/portal', () => ({
  getUiPortalContainer: () => document.body,
  setUiPortalContainer: vi.fn(),
}))

describe('ShellFrame', () => {
  it('renders one navigation landmark and preserves page content', () => {
    const mainRef = createRef<HTMLDivElement>()
    const mockAppShellContext = {
      page: { kind: 'home' as const, tab: 'for-you' as const },
      navigateToStatusDetail: vi.fn(),
      openStatusDetailDialog: vi.fn(),
      navigateToProfile: vi.fn(),
      openProfileDialog: vi.fn(),
      openTopicDialog: vi.fn(),
      resetMainScroll: vi.fn(),
      scrollMainToTop: vi.fn(),
      composeTarget: null,
      setComposeTarget: vi.fn(),
      getNextZIndex: vi.fn(() => 41),
      viewingProfileUserId: null,
      onProfileUserIdChange: vi.fn(),
      onHomeTabChange: vi.fn(),
      refreshTimeline: vi.fn(),
      onFollowGroupChange: vi.fn(),
    } as AppShellContext

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            browsingHistoryEnabled={false}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
            appShellContext={mockAppShellContext}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1)
    expect(screen.getByText('center content')).toBeInTheDocument()
  })
})
