import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommentModal } from '@/features/weibo/components/comment-modal'

vi.mock('@/features/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: ({
    onSelect,
  }: {
    onSelect: (entry: { phrase: string; url: string }) => void
  }) => (
    <button
      type="button"
      onClick={() => onSelect({ phrase: '[色]', url: 'https://face/se.png' })}
    >
      选择表情
    </button>
  ),
}))

describe('CommentModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders repost toggle copy for comment mode', () => {
    render(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        target={{
          kind: 'comment',
          mode: 'comment',
          statusId: '1',
          targetCommentId: '2',
          authorName: 'Alice',
          excerpt: 'hello',
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: '回复评论' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时转发')).toBeInTheDocument()
  })

  it('renders reply toggle copy for repost mode', () => {
    render(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        target={{
          kind: 'status',
          mode: 'repost',
          statusId: '1',
          targetCommentId: null,
          authorName: 'Alice',
          excerpt: 'hello',
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: '转发微博' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时回复')).toBeInTheDocument()
  })

  it('disables submit button when text is empty', () => {
    render(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        target={{
          kind: 'status',
          mode: 'comment',
          statusId: '1',
          targetCommentId: null,
          authorName: 'Alice',
          excerpt: 'hello',
        }}
      />,
    )

    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled()
  })

  it('passes textarea text and secondary toggle state on submit', () => {
    const onSubmit = vi.fn()

    render(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        target={{
          kind: 'status',
          mode: 'comment',
          statusId: '1',
          targetCommentId: null,
          authorName: 'Alice',
          excerpt: 'hello',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '选择表情' }))
    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '太酷了[色]' },
    })
    fireEvent.click(screen.getByLabelText('同时转发'))
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    expect(onSubmit).toHaveBeenCalledWith({
      text: '太酷了[色]',
      alsoSecondaryAction: true,
    })
  })

  it('resets input state when target changes', () => {
    const { rerender } = render(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        target={{
          kind: 'status',
          mode: 'comment',
          statusId: '1',
          targetCommentId: null,
          authorName: 'Alice',
          excerpt: 'hello',
        }}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '旧内容' },
    })

    rerender(
      <CommentModal
        open
        isSubmitting={false}
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        target={{
          kind: 'comment',
          mode: 'comment',
          statusId: '1',
          targetCommentId: '2',
          authorName: 'Bob',
          excerpt: 'world',
        }}
      />,
    )

    expect(screen.getByRole('textbox', { name: '回复内容' })).toHaveValue('')
  })
})
