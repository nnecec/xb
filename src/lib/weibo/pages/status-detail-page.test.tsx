import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setComposeTarget = vi.fn()

vi.mock('@/lib/weibo/app/app-shell-layout', () => ({
  useAppShellContext: () => ({
    page: { kind: 'status', authorId: '1', statusId: '501' },
    navigateToStatusDetail: vi.fn(),
    resetMainScroll: vi.fn(),
    composeTarget: null,
    setComposeTarget,
    viewingProfileUserId: null,
    onProfileUserIdChange: vi.fn(),
    onHomeTabChange: vi.fn(),
  }),
}))

vi.mock('@/lib/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/services/weibo-repository')>(
    '@/lib/weibo/services/weibo-repository',
  )
  return {
    ...actual,
    loadStatusDetail: vi.fn(),
    loadStatusComments: vi.fn(),
  }
})

vi.mock('@/lib/weibo/components/feed-card', () => ({
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

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { StatusDetailPage } from '@/lib/weibo/pages/status-detail-page'
import { loadStatusComments, loadStatusDetail } from '@/lib/weibo/services/weibo-repository'

describe('StatusDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

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
      theme: 'system',
      rewriteEnabled: true,
      isHydrated: true,
    })
    vi.mocked(loadStatusDetail).mockResolvedValue({
      status: {
        id: '501',
        isLongText: false,
        mblogId: null,
        text: 'main post',
        createdAt: '2024-01-01',
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
          createdAt: '2024-01-01',
          createdAtLabel: 'today',
          author: { id: '8', name: 'Retweeter', avatarUrl: null },
          stats: { likes: 0, comments: 0, reposts: 0 },
          images: [],
          media: null,
          regionName: '',
          source: '',
        },
      },
    })
    vi.mocked(loadStatusComments).mockResolvedValue({
      items: [
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
      ],
      nextCursor: null,
    })
  })

  it('renders the main post and replies', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/1/501']}>
          <StatusDetailPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('main post')).toBeInTheDocument()
    expect(screen.getByText('retweeted post')).toBeInTheDocument()
    expect(await screen.findByText('reply')).toBeInTheDocument()
    expect(await screen.findByText('nested reply')).toBeInTheDocument()
    expect(await screen.findByText('third level reply')).toBeInTheDocument()
  })

  it('supports reply/repost for status and reply entry for nested comments', async () => {
    vi.mocked(loadStatusDetail).mockResolvedValue({
      status: {
        id: '501',
        isLongText: false,
        mblogId: null,
        text: 'main post',
        createdAt: '2024-01-01',
        createdAtLabel: 'today',
        author: { id: '1', name: 'Alice', avatarUrl: null },
        stats: { likes: 1, comments: 1, reposts: 0 },
        images: [],
        media: null,
        regionName: '',
        source: '',
        retweetedStatus: null,
      },
    })
    vi.mocked(loadStatusComments).mockResolvedValue({
      items: [
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
      ],
      nextCursor: null,
    })

    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/1/501']}>
          <StatusDetailPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByText('main post')
    await screen.findByText('reply level 1')

    fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
    expect(setComposeTarget).toHaveBeenCalledWith({
      kind: 'status',
      mode: 'comment',
      statusId: '501',
      targetCommentId: null,
      authorName: 'Alice',
      excerpt: 'main post',
    })

    fireEvent.click(screen.getByRole('button', { name: '转发微博' }))
    expect(setComposeTarget).toHaveBeenCalledWith({
      kind: 'status',
      mode: 'repost',
      statusId: '501',
      targetCommentId: null,
      authorName: 'Alice',
      excerpt: 'main post',
    })

    const replyButtons = screen.getAllByRole('button', { name: '回复评论' })
    replyButtons.forEach((button) => fireEvent.click(button))

    expect(setComposeTarget).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '601',
      authorName: 'Bob',
      excerpt: 'reply level 1',
    })
    expect(setComposeTarget).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '602',
      authorName: 'Carol',
      excerpt: 'reply level 2',
    })
    expect(setComposeTarget).toHaveBeenCalledWith({
      kind: 'comment',
      mode: 'comment',
      statusId: '501',
      targetCommentId: '603',
      authorName: 'Dave',
      excerpt: 'reply level 3',
    })
  })
})
