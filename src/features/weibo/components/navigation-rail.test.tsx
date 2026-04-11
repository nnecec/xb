import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NavigationRail } from '@/features/weibo/components/navigation-rail'

const getCurrentUserUidMock = vi.fn<() => string | null>()

vi.mock('@/features/weibo/platform/current-user', () => ({
  getCurrentUserUid: () => getCurrentUserUidMock(),
}))

describe('NavigationRail', () => {
  beforeEach(() => {
    getCurrentUserUidMock.mockReset()
    getCurrentUserUidMock.mockReturnValue('1001')
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
    return render(
      <MemoryRouter>
        <NavigationRail
          pageKind={pageKind}
          viewingProfileUserId={viewingProfileUserId}
          rewriteEnabled={rewriteEnabled}
          theme="system"
          onRewriteEnabledChange={vi.fn()}
          onThemeChange={vi.fn()}
        />
      </MemoryRouter>,
    )
  }

  it('renders an accessible navigation landmark', () => {
    renderNavigationRail()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
  })

  it('marks active links through aria-current', () => {
    renderNavigationRail()
    expect(screen.getByRole('link', { name: '主页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '个人主页' })).not.toHaveAttribute('aria-current')
  })

  it('marks profile as active when viewing current user profile', () => {
    renderNavigationRail({ pageKind: 'profile', viewingProfileUserId: '1001' })
    expect(screen.getByRole('link', { name: '个人主页' })).toHaveAttribute('aria-current', 'page')
  })

  it('uses fallback profile href when current user id is missing', () => {
    getCurrentUserUidMock.mockReturnValue(null)
    renderNavigationRail()
    expect(screen.getByRole('link', { name: '个人主页' })).toHaveAttribute('href', '/')
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
})
