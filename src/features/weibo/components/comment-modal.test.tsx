import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommentModal } from '@/features/weibo/components/comment-modal'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/features/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: ({
    onSelect,
  }: {
    onSelect: (entry: { phrase: string; url: string }) => void
  }) => (
    <button type="button" onClick={() => onSelect({ phrase: '[色]', url: 'https://face/se.png' })}>
      选择表情
    </button>
  ),
}))

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    submitComposeAction: vi.fn(async () => {}),
  }
})

function renderCommentModal(props: ComponentProps<typeof CommentModal>) {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <CommentModal {...props} />
    </QueryClientProvider>,
  )
}

describe('CommentModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders repost toggle copy for comment mode', () => {
    renderCommentModal({
      open: true,
      onOpenChange: () => {},
      target: {
        kind: 'comment',
        mode: 'comment',
        statusId: '1',
        targetCommentId: '2',
        authorName: 'Alice',
        excerpt: 'hello',
      },
    })

    expect(screen.getByRole('heading', { name: '回复评论' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时转发')).toBeInTheDocument()
  })

  it('renders reply toggle copy for repost mode', () => {
    renderCommentModal({
      open: true,
      onOpenChange: () => {},
      target: {
        kind: 'status',
        mode: 'repost',
        statusId: '1',
        targetCommentId: null,
        authorName: 'Alice',
        excerpt: 'hello',
      },
    })

    expect(screen.getByRole('heading', { name: '转发微博' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时回复')).toBeInTheDocument()
  })

  it('disables submit button when text is empty', () => {
    renderCommentModal({
      open: true,
      onOpenChange: () => {},
      target: {
        kind: 'status',
        mode: 'comment',
        statusId: '1',
        targetCommentId: null,
        authorName: 'Alice',
        excerpt: 'hello',
      },
    })

    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled()
  })

  it('submits textarea text and closes on success', async () => {
    const onOpenChange = vi.fn()

    renderCommentModal({
      open: true,
      onOpenChange,
      target: {
        kind: 'status',
        mode: 'comment',
        statusId: '1',
        targetCommentId: null,
        authorName: 'Alice',
        excerpt: 'hello',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: '选择表情' }))
    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '太酷了[色]' },
    })
    fireEvent.click(screen.getByLabelText('同时转发'))
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    const { submitComposeAction } = await import('@/features/weibo/services/weibo-repository')

    await waitFor(() => {
      expect(vi.mocked(submitComposeAction)).toHaveBeenCalledWith(
        {
          target: {
            kind: 'status',
            mode: 'comment',
            statusId: '1',
            targetCommentId: null,
            authorName: 'Alice',
            excerpt: 'hello',
          },
          text: '太酷了[色]',
          alsoSecondaryAction: true,
        },
        expect.anything(),
      )
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('resets input state when target changes', () => {
    const { rerender } = renderCommentModal({
      open: true,
      onOpenChange: () => {},
      target: {
        kind: 'status',
        mode: 'comment',
        statusId: '1',
        targetCommentId: null,
        authorName: 'Alice',
        excerpt: 'hello',
      },
    })

    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '旧内容' },
    })

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CommentModal
          open
          onOpenChange={() => {}}
          target={{
            kind: 'comment',
            mode: 'comment',
            statusId: '1',
            targetCommentId: '2',
            authorName: 'Bob',
            excerpt: 'world',
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('textbox', { name: '回复内容' })).toHaveValue('')
  })
})
