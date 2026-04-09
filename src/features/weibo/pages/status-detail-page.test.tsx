import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

describe('StatusDetailPage', () => {
  it('renders the main post and replies', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
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
                regionName: '',
                source: '',
                retweetedStatus: {
                  id: '700',
                  mblogId: null,
                  isLongText: false,
                  text: 'retweeted post',
                  createdAtLabel: 'today',
                  author: { id: '8', name: 'Retweeter', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                },
              },
            }}
            comments={[
              {
                id: '601',
                text: 'reply',
                createdAtLabel: 'today',
                author: { id: '2', name: 'Bob', avatarUrl: null },
                likeCount: 0,
                source: '来自江苏',
                replyComment: null,
                comments: [
                  {
                    id: '602',
                    text: 'nested reply',
                    createdAtLabel: 'today',
                    author: { id: '3', name: 'Carol', avatarUrl: null },
                    likeCount: 0,
                    source: '',
                    replyComment: null,
                    comments: [
                      {
                        id: '603',
                        text: 'third level reply',
                        createdAtLabel: 'today',
                        author: { id: '4', name: 'Dave', avatarUrl: null },
                        likeCount: 0,
                        source: '',
                        replyComment: null,
                        comments: [],
                      },
                    ],
                  },
                ],
              },
            ]}
            hasNextPage={false}
            isFetchingNextPage={false}
            onLoadNextPage={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('main post')).toBeInTheDocument()
    expect(screen.getByText('retweeted post')).toBeInTheDocument()
    expect(screen.getByText('reply')).toBeInTheDocument()
    expect(screen.getByText('nested reply')).toBeInTheDocument()
    expect(screen.getByText('third level reply')).toBeInTheDocument()
  })
})
