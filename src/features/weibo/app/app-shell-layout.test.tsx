import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { ShellFrame } from '@/features/weibo/app/app-shell-layout'

vi.mock('@/features/weibo/components/right-rail', () => ({
  RightRail: () => <div data-testid="right-rail">right rail</div>,
}))

describe('ShellFrame', () => {
  it('renders one navigation landmark and preserves page content', () => {
    render(
      <MemoryRouter>
        <ShellFrame
          pageKind="home"
          viewingProfileUserId={null}
          rewriteEnabled
          theme="system"
          onRewriteEnabledChange={vi.fn()}
          onThemeChange={vi.fn()}
        >
          <div>center content</div>
        </ShellFrame>
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(1)
    expect(screen.getByText('center content')).toBeInTheDocument()
  })
})
