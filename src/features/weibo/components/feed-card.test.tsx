import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FeedCard } from '@/features/weibo/components/feed-card'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadStatusLongText: vi.fn(),
  }
})

describe('FeedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows retrying long text after the first request fails', async () => {
    const loadStatusLongTextMock = vi.mocked(loadStatusLongText)
    loadStatusLongTextMock
      .mockRejectedValueOnce(new Error('network-error'))
      .mockResolvedValueOnce('expanded post content')

    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeedCard
            item={{
              id: '501',
              mblogId: 'm501',
              isLongText: true,
              text: 'preview content',
              createdAtLabel: 'today',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 1, comments: 2, reposts: 3 },
              images: [],
              media: null,
              regionName: '',
              source: '',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '全文' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重试全文' })).toBeInTheDocument()
    })

    expect(loadStatusLongTextMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '重试全文' }))

    await waitFor(() => {
      expect(loadStatusLongTextMock).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(screen.getByText('expanded post content')).toBeInTheDocument()
    })
  })
})
