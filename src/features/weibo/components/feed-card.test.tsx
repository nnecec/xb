import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FeedCard } from '@/features/weibo/components/feed-card'
import type { FeedItem } from '@/features/weibo/models/feed'
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

  afterEach(() => {
    cleanup()
  })

  function renderCard({
    onNavigate,
    onCommentClick,
    onRepostClick,
  }: {
    onNavigate?: (item: FeedItem) => void
    onCommentClick?: (item: FeedItem) => void
    onRepostClick?: (item: FeedItem) => void
  } = {}) {
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
            onNavigate={onNavigate}
            onCommentClick={onCommentClick}
            onRepostClick={onRepostClick}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('allows retrying long text after the first request fails', async () => {
    const loadStatusLongTextMock = vi.mocked(loadStatusLongText)
    loadStatusLongTextMock
      .mockRejectedValueOnce(new Error('network-error'))
      .mockResolvedValueOnce('expanded post content')

    renderCard()

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

  it('triggers detail callback when clicking card body', () => {
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    fireEvent.click(screen.getByText('preview content'))

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '501',
      }),
    )
  })

  it('does not trigger card navigation when clicking comment or repost actions', () => {
    const onNavigate = vi.fn()
    const onCommentClick = vi.fn()
    const onRepostClick = vi.fn()
    renderCard({ onNavigate, onCommentClick, onRepostClick })

    const commentButton = screen.getByRole('button', { name: '回复微博' })
    const repostButton = screen.getByRole('button', { name: '转发微博' })

    fireEvent.click(commentButton)
    fireEvent.click(repostButton)

    expect(onNavigate).not.toHaveBeenCalled()
    expect(onCommentClick).toHaveBeenCalledWith(expect.objectContaining({ id: '501' }))
    expect(onRepostClick).toHaveBeenCalledWith(expect.objectContaining({ id: '501' }))
    expect(commentButton).toHaveClass('hover:text-sky-500')
    expect(repostButton).toHaveClass('hover:text-emerald-500')
    expect(screen.getByRole('button', { name: '点赞微博' })).toHaveClass('hover:text-rose-500')
  })
})
