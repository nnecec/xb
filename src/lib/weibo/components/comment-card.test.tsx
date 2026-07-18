import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { CommentCard } from '@/lib/weibo/components/comment-card'
import type { CommentItem } from '@/lib/weibo/models/status'
import { loadNestedComments } from '@/lib/weibo/services/weibo-repository'

vi.mock('@/lib/weibo/services/weibo-repository', () => ({
  cancelCommentLike: vi.fn(),
  deleteWeiboComment: vi.fn(),
  loadEmoticonConfig: vi.fn(async () => ({ groups: [], phraseMap: {} })),
  loadNestedComments: vi.fn(),
  setCommentLike: vi.fn(),
}))

vi.mock('@/lib/weibo/hooks/use-font-settings', () => ({
  useFontSettings: () => ({
    fontSizeClass: 'text-sm',
    fontWeightClass: 'font-normal',
    letterSpacingClass: 'tracking-normal',
    lineHeightClass: 'leading-relaxed',
    fontFamilyClass: 'font-sans',
    textClassName: 'xb-status-text text-sm font-normal tracking-normal leading-relaxed font-sans',
    loadStatus: 'idle' as const,
    isRemote: false,
  }),
}))

const thumb = 'https://example.com/t.jpg'
const large = 'https://example.com/l.jpg'

describe('CommentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      collapseRepliesEnabled: false,
      isHydrated: true,
    })
  })

  afterEach(() => {
    cleanup()
    resetAppSettingsStoreForTest()
  })

  it('renders comment images once (no duplicate carousels)', () => {
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'hi',
      createdAtLabel: 'now',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [
        { id: 'i1', thumbnailUrl: thumb, largeUrl: large },
        { id: 'i2', thumbnailUrl: thumb, largeUrl: large },
      ],
      replyComment: null,
      comments: [],
    }

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="u1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(container.querySelectorAll('img.aspect-square')).toHaveLength(2)
  })

  it('keeps the root status id when replying from nested comments dialog', async () => {
    const queryClient = new QueryClient()
    const onCommentReply = vi.fn()
    const item: CommentItem = {
      id: 'c1',
      text: 'parent',
      createdAtLabel: 'now',
      author: { id: '2', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [],
      replyComment: null,
      comments: [
        {
          id: 'c-preview',
          text: 'preview reply',
          createdAtLabel: 'now',
          author: { id: '4', name: 'C', avatarUrl: null },
          likeCount: 0,
          images: [],
          replyComment: null,
          comments: [],
        },
      ],
      moreInfoText: '查看更多回复',
    }
    vi.mocked(loadNestedComments).mockResolvedValue({
      items: [
        {
          id: 'c2',
          text: 'child reply',
          createdAtLabel: 'now',
          author: { id: '3', name: 'B', avatarUrl: null },
          likeCount: 0,
          images: [],
          replyComment: null,
          comments: [],
        },
      ],
      nextCursor: null,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard
            item={item}
            rootStatusId="status-1"
            authorUid="root-author"
            onCommentReply={onCommentReply}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '查看更多回复' }))
    expect(await screen.findByText('child reply')).toBeInTheDocument()
    const replyButtons = screen.getAllByRole('button', { name: '回复评论' })
    fireEvent.click(replyButtons[replyButtons.length - 1])

    await waitFor(() => {
      expect(onCommentReply).toHaveBeenCalledWith({
        kind: 'comment',
        mode: 'comment',
        statusId: 'status-1',
        targetCommentId: 'c2',
        authorName: 'B',
        excerpt: 'child reply',
      })
    })
  })
})
