import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'

describe('HomeTimelinePage', () => {
  it('renders tabs and feed cards', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomeTimelinePage
            activeTab="for-you"
            errorMessage={null}
            isLoading={false}
            onNavigate={vi.fn()}
            onRetry={vi.fn()}
            hasNextPage={false}
            isFetchingNextPage={false}
            onLoadNextPage={vi.fn()}
            onCommentClick={vi.fn()}
            onRepostClick={vi.fn()}
            onTabChange={vi.fn()}
            items={[
              {
                id: '501',
                isLongText: false,
                mblogId: null,
                text: 'hello world',
                createdAtLabel: 'just now',
                author: { id: '1', name: 'Alice', avatarUrl: null },
                stats: { likes: 7, comments: 3, reposts: 1 },
                images: [],
                media: null,
                regionName: '',
                source: '',
              },
            ]}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('tab', { name: 'For You' })).toBeInTheDocument()
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })
})
