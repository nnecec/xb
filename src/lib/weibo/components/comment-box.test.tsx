import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CommentBox } from '@/lib/weibo/components/comment-box'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { FeedItem } from '@/lib/weibo/models/feed'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: () => <div data-testid="emoticon-picker" />,
}))

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    submitComposeAction: vi.fn(async () => {}),
  }
})

const commentTarget: ComposeTarget = {
  kind: 'status',
  mode: 'comment',
  statusId: 'status-1',
  targetCommentId: null,
  authorName: 'Alice',
  excerpt: 'hello',
}

function createFeedItem(): FeedItem {
  return {
    id: 'status-1',
    mblogId: 'mblog-1',
    isLongText: false,
    liked: false,
    favorited: false,
    author: { id: 'user-1', name: 'Alice', avatarUrl: null },
    text: 'hello',
    createdAt: '',
    createdAtLabel: '',
    stats: { likes: 0, comments: 2, reposts: 0 },
    images: [],
    media: null,
  }
}

function renderCommentBox(target: ComposeTarget = commentTarget) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(['weibo', 'timeline'], { pages: [{ items: [createFeedItem()] }] })
  queryClient.setQueryData(['weibo', 'status-comments', 'status-1'], { pages: [{ items: [] }] })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CommentBox target={target} />
      </QueryClientProvider>,
    ),
  }
}

describe('CommentBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('disables submit when comment text is empty', () => {
    renderCommentBox()
    expect(screen.getByRole('button', { name: '发布评论' })).toBeDisabled()
  })

  it('submits a comment and clears the textarea on success', async () => {
    const { submitComposeAction } = await import('@/lib/weibo/data/weibo-io')
    const { toast } = await import('sonner')
    vi.mocked(submitComposeAction).mockResolvedValueOnce(undefined)

    const { queryClient } = renderCommentBox()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const textarea = screen.getByRole('textbox', { name: '评论内容' })
    fireEvent.change(textarea, { target: { value: 'nice post' } })
    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))

    await waitFor(() => {
      expect(vi.mocked(submitComposeAction)).toHaveBeenCalledWith(
        {
          target: commentTarget,
          text: 'nice post',
          alsoSecondaryAction: false,
        },
        expect.anything(),
      )
    })
    expect(
      queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
        ?.pages[0]?.items[0]?.stats.comments,
    ).toBe(3)
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('评论已发布')
      expect(textarea).toHaveValue('')
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['weibo', 'status-comments', 'status-1'],
      })
    })
  })

  it('restores optimistic state and shows an error toast on failure', async () => {
    const { submitComposeAction } = await import('@/lib/weibo/data/weibo-io')
    const { toast } = await import('sonner')
    vi.mocked(submitComposeAction).mockRejectedValueOnce(new Error('compose failed'))

    const { queryClient } = renderCommentBox()

    fireEvent.change(screen.getByRole('textbox', { name: '评论内容' }), {
      target: { value: 'nice post' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('compose failed')
      expect(
        queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(['weibo', 'timeline'])
          ?.pages[0]?.items[0]?.stats.comments,
      ).toBe(2)
    })
  })
})
