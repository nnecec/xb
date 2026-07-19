import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommentItem } from '@/lib/weibo/models/status'

const { fetchNextPage, queryState } = vi.hoisted(() => ({
  fetchNextPage: vi.fn(),
  queryState: {
    isFetchingNextPage: false,
  },
}))

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useInfiniteQuery: () => ({
      data: {
        pages: [
          {
            items: [createCommentItem()],
            total: 2,
            nextCursor: 'cursor-2',
          },
        ],
      },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: queryState.isFetchingNextPage,
    }),
  }
})

vi.mock('@/lib/weibo/components/comment-list', () => ({
  CommentList: ({ comments }: { comments: CommentItem[] }) => (
    <div data-testid="comment-list">
      {comments.map((item) => (
        <div key={item.id}>{item.text}</div>
      ))}
    </div>
  ),
}))

import { CommentsDialog } from '@/lib/weibo/components/comments-dialog'

function createCommentItem(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: 'comment-1',
    text: 'nested reply',
    createdAtLabel: '',
    author: { id: 'user-1', name: 'Alice', avatarUrl: null },
    likeCount: 0,
    liked: false,
    images: [],
    replyComment: null,
    comments: [],
    ...overrides,
  }
}

function setScrollGeometry(scrollEl: HTMLElement) {
  Object.defineProperty(scrollEl, 'scrollHeight', { value: 1000, configurable: true })
  Object.defineProperty(scrollEl, 'clientHeight', { value: 400, configurable: true })
  Object.defineProperty(scrollEl, 'scrollTop', { value: 550, configurable: true })
}

describe('CommentsDialog', () => {
  beforeEach(() => {
    fetchNextPage.mockClear()
    queryState.isFetchingNextPage = false
  })

  it('fetches the next page when scrolled near the bottom', () => {
    render(
      <CommentsDialog
        open={true}
        rootStatusId="root-1"
        statusId="status-1"
        authorUid="author-1"
        onOpenChange={vi.fn()}
      />,
    )

    const scrollEl = screen.getByTestId('comments-dialog-scroll')
    setScrollGeometry(scrollEl)
    scrollEl.dispatchEvent(new Event('scroll'))

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('does not fetch the next page while a next page is already loading', () => {
    queryState.isFetchingNextPage = true

    render(
      <CommentsDialog
        open={true}
        rootStatusId="root-1"
        statusId="status-1"
        authorUid="author-1"
        onOpenChange={vi.fn()}
      />,
    )

    const scrollEl = screen.getByTestId('comments-dialog-scroll')
    setScrollGeometry(scrollEl)
    scrollEl.dispatchEvent(new Event('scroll'))

    expect(fetchNextPage).not.toHaveBeenCalled()
  })
})
