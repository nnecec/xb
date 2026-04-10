import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/weibo/components/feed-card', () => ({
  FeedCard: ({
    item,
    onCommentClick,
    onRepostClick,
  }: {
    item: {
      text: string
      retweetedStatus: { text: string } | null
    }
    onCommentClick?: (item: { text: string }) => void
    onRepostClick?: (item: { text: string }) => void
  }) => (
    <div>
      <p>{item.text}</p>
      {item.retweetedStatus ? <p>{item.retweetedStatus.text}</p> : null}
      <button type="button" aria-label="回复微博" onClick={() => onCommentClick?.(item)}>
        1
      </button>
      <button type="button" aria-label="转发微博" onClick={() => onRepostClick?.(item)}>
        2
      </button>
    </div>
  ),
}))

import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

describe('StatusDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

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
                images: [],
                replyComment: null,
                comments: [
                  {
                    id: '602',
                    text: 'nested reply',
                    createdAtLabel: 'today',
                    author: { id: '3', name: 'Carol', avatarUrl: null },
                    likeCount: 0,
                    source: '',
                    images: [],
                    replyComment: null,
                    comments: [
                      {
                        id: '603',
                        text: 'third level reply',
                        createdAtLabel: 'today',
                        author: { id: '4', name: 'Dave', avatarUrl: null },
                        likeCount: 0,
                        source: '',
                        images: [],
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

  it('supports reply/repost for status and reply entry for nested comments', () => {
    const queryClient = new QueryClient()
    const onStatusComment = vi.fn()
    const onStatusRepost = vi.fn()
    const onCommentReply = vi.fn()
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
                retweetedStatus: null,
              },
            }}
            comments={[
              {
                id: '601',
                text: 'reply level 1',
                createdAtLabel: 'today',
                author: { id: '2', name: 'Bob', avatarUrl: null },
                likeCount: 0,
                source: 'from',
                images: [],
                replyComment: null,
                comments: [
                  {
                    id: '602',
                    text: 'reply level 2',
                    createdAtLabel: 'today',
                    author: { id: '3', name: 'Carol', avatarUrl: null },
                    likeCount: 0,
                    source: '',
                    images: [],
                    replyComment: null,
                    comments: [
                      {
                        id: '603',
                        text: 'reply level 3',
                        createdAtLabel: 'today',
                        author: { id: '4', name: 'Dave', avatarUrl: null },
                        likeCount: 0,
                        source: '',
                        images: [],
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
            onStatusComment={onStatusComment}
            onStatusRepost={onStatusRepost}
            onCommentReply={onCommentReply}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
    expect(onStatusComment).toHaveBeenCalledWith({
      kind: 'status',
      mode: 'comment',
      statusId: '501',
      targetCommentId: null,
      authorName: 'Alice',
      excerpt: 'main post',
    })

    fireEvent.click(screen.getByRole('button', { name: '转发微博' }))
    expect(onStatusRepost).toHaveBeenCalledWith({
      kind: 'status',
      mode: 'repost',
      statusId: '501',
      targetCommentId: null,
      authorName: 'Alice',
      excerpt: 'main post',
    })

    const replyButtons = screen.getAllByRole('button', { name: '回复评论' })
    replyButtons.forEach((button) => fireEvent.click(button))

    expect(onCommentReply).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '601',
      authorName: 'Bob',
      excerpt: 'reply level 1',
    })
    expect(onCommentReply).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '602',
      authorName: 'Carol',
      excerpt: 'reply level 2',
    })
    expect(onCommentReply).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '603',
      authorName: 'Dave',
      excerpt: 'reply level 3',
    })
  })
})
