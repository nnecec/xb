import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'

describe('HomeTimelinePage', () => {
  it('renders tabs and feed cards', () => {
    render(
      <HomeTimelinePage
        activeTab="for-you"
        errorMessage={null}
        isLoading={false}
        onRetry={vi.fn()}
        onTabChange={vi.fn()}
        page={{
          items: [
            {
              id: '501',
              text: 'hello world',
              createdAtLabel: 'just now',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 7, comments: 3, reposts: 1 },
            },
          ],
          nextCursor: null,
        }}
      />,
    )

    expect(screen.getByRole('tab', { name: 'For You' })).toBeInTheDocument()
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })
})
