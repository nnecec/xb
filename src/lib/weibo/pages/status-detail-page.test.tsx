import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
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
import { loadStatusComments, loadStatusDetail } from '@/lib/weibo/data/weibo-io'
import { StatusDetailPage } from '@/lib/weibo/pages/status-detail-page'

class TestIntersectionObserver {
  static instances: TestIntersectionObserver[] = []
  readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    TestIntersectionObserver.instances.push(this)
  }

  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [])
}

describe('StatusDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    TestIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
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

  it('shows the status summary in the top bar only after the status leaves view', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/1/501']}>
          <StatusDetailPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { name: '微博正文' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Alice/ })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(TestIntersectionObserver.instances).toHaveLength(1)
    })

    act(() => {
      TestIntersectionObserver.instances[0]?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        TestIntersectionObserver.instances[0] as unknown as IntersectionObserver,
      )
    })

    const summaryHeading = await screen.findByRole('heading', { name: /Alice/ })
    expect(summaryHeading).toBeInTheDocument()
    expect(summaryHeading).toHaveTextContent('today')
    expect(summaryHeading.parentElement).toHaveTextContent('main post')
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

    // Nested comment replies are inline CommentBox (not global compose modal).
    const replyButtons = screen.getAllByRole('button', { name: '回复评论' })
    expect(replyButtons.length).toBeGreaterThanOrEqual(3)

    fireEvent.click(replyButtons[0])
    expect(await screen.findByPlaceholderText('回复 @Bob')).toBeInTheDocument()

    fireEvent.click(replyButtons[1])
    expect(await screen.findByPlaceholderText('回复 @Carol')).toBeInTheDocument()

    fireEvent.click(replyButtons[2])
    expect(await screen.findByPlaceholderText('回复 @Dave')).toBeInTheDocument()

    // Status-level reply/repost still go through global compose; comment replies do not.
    expect(setComposeTarget).toHaveBeenCalledTimes(2)
  })

  it('lets the detail column fill the available content width', async () => {
    const store = getAppSettingsStore()
    store.setState({
      ...store.getState(),
      contentWidth: 'wider',
    })

    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/1/501']}>
          <StatusDetailPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const mainPost = await screen.findByText('main post')
    const detailColumn = mainPost.closest('article')?.parentElement

    expect(detailColumn).not.toBeNull()
    expect(detailColumn).toHaveClass('w-full')
    expect(detailColumn).not.toHaveAttribute('style')
  })
})
