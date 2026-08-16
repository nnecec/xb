import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { CommentCard } from '@/lib/weibo/components/comment-card'
import { loadNestedComments } from '@/lib/weibo/data/weibo-io'
import type { CommentItem } from '@/lib/weibo/models/status'

vi.mock('@/lib/weibo/data/weibo-io', () => ({
  cancelCommentLike: vi.fn(),
  deleteWeiboComment: vi.fn(),
  loadEmoticonConfig: vi.fn(async () => ({ groups: [], phraseMap: {} })),
  loadNestedComments: vi.fn(),
  setCommentLike: vi.fn(),
  submitComposeAction: vi.fn(),
}))

vi.mock('@/lib/weibo/hooks/use-font-settings', () => ({
  useFontSettings: () => ({
    contentFontSize: 14,
    fontWeightClass: 'font-normal',
    letterSpacingClass: 'tracking-normal',
    lineHeightClass: 'leading-relaxed',
    fontFamilyClass: 'font-sans',
    textClassName: 'xb-status-text font-normal tracking-normal leading-relaxed font-sans',
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

  it('uses the configured single image maximum width for one comment image', () => {
    getAppSettingsStore().setState({ weiboCardSingleImageMaxWidth: 620 })
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'hi',
      createdAtLabel: 'now',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [{ id: 'i1', thumbnailUrl: thumb, largeUrl: large }],
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

    expect(container.querySelector('.grid')).toHaveStyle({ maxWidth: '620px' })
  })

  it('hides reply-to preview and keeps publish info for replies', () => {
    getAppSettingsStore().setState({ commentCardShowPublishInfo: true })
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'my reply',
      createdAtLabel: 'now',
      source: '来自 iPhone 客户端',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [],
      replyComment: {
        id: 'c0',
        text: 'original thought',
        author: { id: '9', name: 'Orig', avatarUrl: null },
        images: [],
      },
      comments: [],
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="u1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('my reply')).toBeInTheDocument()
    expect(screen.getByText('来自 iPhone 客户端')).toBeInTheDocument()
    expect(screen.queryByText('回复')).not.toBeInTheDocument()
    expect(screen.queryByText('@Orig')).not.toBeInTheDocument()
    expect(screen.queryByText('original thought')).not.toBeInTheDocument()
  })

  it('loads more nested replies in a dialog and opens inline reply for child', async () => {
    const queryClient = new QueryClient()
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
          <CommentCard item={item} rootStatusId="status-1" authorUid="root-author" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '查看更多回复' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '评论详情' })).toBeInTheDocument()
    expect(await screen.findByText('child reply')).toBeInTheDocument()

    const replyButtons = screen.getAllByRole('button', { name: '回复评论' })
    fireEvent.click(replyButtons[replyButtons.length - 1]!)

    expect(await screen.findByPlaceholderText('回复 @B')).toBeInTheDocument()
  })

  it('marks the status author with a 博主 badge', () => {
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'from author',
      createdAtLabel: 'now',
      author: { id: 'root-author', name: 'Author', avatarUrl: null },
      likeCount: 0,
      images: [],
      replyComment: null,
      comments: [],
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="root-author" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('博主')).toBeInTheDocument()
  })

  it('applies comment metadata and image display settings', () => {
    getAppSettingsStore().setState({
      commentCardShowAvatar: false,
      commentCardShowTimestamp: false,
      commentCardShowPublishInfo: true,
      commentCardShowAuthorBadge: false,
      commentCardShowLikeCount: false,
      commentCardImageDisplay: 'collapsed',
    })
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'from author',
      createdAtLabel: '刚刚',
      source: 'iPhone 客户端',
      author: {
        id: 'root-author',
        name: 'Author',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      likeCount: 8,
      images: [{ id: 'i1', thumbnailUrl: thumb, largeUrl: large }],
      replyComment: null,
      comments: [],
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="root-author" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByRole('img', { name: 'Author' })).not.toBeInTheDocument()
    expect(screen.queryByText('刚刚')).not.toBeInTheDocument()
    expect(screen.getByText('iPhone 客户端')).toBeInTheDocument()
    expect(screen.queryByText('博主')).not.toBeInTheDocument()
    expect(screen.queryByText('8')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '此评论包含 1 张图片，点击显示' }),
    ).toBeInTheDocument()
  })

  it('collapses nested replies by default and allows a temporary reveal', () => {
    getAppSettingsStore().setState({ commentCardCollapseRepliesByDefault: true })
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'parent',
      createdAtLabel: 'now',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [],
      replyComment: null,
      comments: [
        {
          id: 'c2',
          text: 'nested reply',
          createdAtLabel: 'now',
          author: { id: '2', name: 'B', avatarUrl: null },
          likeCount: 0,
          images: [],
          replyComment: null,
          comments: [],
        },
      ],
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="root-author" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByText('nested reply')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看 1 条回复' }))
    expect(screen.getByText('nested reply')).toBeInTheDocument()
  })
})
