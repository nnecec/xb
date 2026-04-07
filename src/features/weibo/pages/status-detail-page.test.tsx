import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

describe('StatusDetailPage', () => {
  it('renders the main post and replies', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <StatusDetailPage
        detail={{
          status: {
            id: '501',
            isLongText: false,
            mblogId: null,
            text: 'main post',
            createdAtLabel: 'today',
            author: { id: '1', name: 'Alice', avatarUrl: null },
            stats: { likes: 1, comments: 1, reposts: 0 },
            images: [],
            media: null,
          },
        }}
        comments={[
            {
              id: '601',
              isLongText: false,
              mblogId: null,
              text: 'reply',
              createdAtLabel: 'today',
              author: { id: '2', name: 'Bob', avatarUrl: null },
              stats: { likes: 0, comments: 0, reposts: 0 },
              images: [],
              media: null,
            },
          ]}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadNextPage={() => {}}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByText('main post')).toBeInTheDocument()
    expect(screen.getByText('reply')).toBeInTheDocument()
  })
})
