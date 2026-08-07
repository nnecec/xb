import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { GenImageDialogProvider } from '@/lib/weibo/components/gen-image-dialog-context'
import {
  DetailStatusCard,
  StatusCard,
  StatusCardHostProvider,
} from '@/lib/weibo/components/status-card'
import { loadStatusLongText, setStatusLike } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'

const loadStatusLongTextMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/weibo/data/weibo-data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-data')>(
    '@/lib/weibo/data/weibo-data',
  )
  return {
    ...actual,
    loadStatusLongText: loadStatusLongTextMock,
    longTextQueryOptions: (mblogId: string | null, enabled: boolean) => ({
      queryKey: ['weibo', 'status', 'long-text', mblogId],
      queryFn: () => loadStatusLongTextMock(mblogId),
      enabled,
    }),
    setStatusLike: vi.fn().mockResolvedValue(undefined),
    cancelStatusLike: vi.fn().mockResolvedValue(undefined),
    createFavorite: vi.fn().mockResolvedValue(undefined),
    destroyFavorite: vi.fn().mockResolvedValue(undefined),
    deleteWeiboStatus: vi.fn().mockResolvedValue(undefined),
    loadFeedComments: vi.fn().mockResolvedValue({ items: [], totalNumber: 0 }),
  }
})

vi.mock('@/lib/weibo/hooks/use-font-settings', () => ({
  useFontSettings: () => ({
    textClassName: 'xb-status-text font-normal tracking-normal leading-relaxed font-sans',
  }),
}))

vi.mock('@/lib/weibo/components/gen-image-dialog-context', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/weibo/components/gen-image-dialog-context')
  >('@/lib/weibo/components/gen-image-dialog-context')
  return {
    ...actual,
    useGenImageDialog: () => ({
      openGenImage: vi.fn(),
      closeGenImage: vi.fn(),
      genImageItem: null,
    }),
  }
})

function createStatus(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    mblogId: `m${id}`,
    isLongText: false,
    text: `status ${id}`,
    createdAt: '2024-01-01',
    createdAtLabel: '今天',
    author: { id: `author-${id}`, name: `Author ${id}`, avatarUrl: null },
    stats: { likes: 1, comments: 2, reposts: 3 },
    images: [],
    media: null,
    regionName: '',
    source: '',
    ...overrides,
  }
}

describe('StatusCard module', () => {
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
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      feedInteractionMode: 'x',
      feedPrimaryActionOrder: ['comment', 'repost', 'like'],
      feedToolbarButtonIds: [],
      autoLoadLongText: false,
      isHydrated: true,
    })
  })

  afterEach(() => cleanup())

  function renderCard(
    status: FeedItem,
    host: {
      openStatus: (item: FeedItem) => void
      composeStatus: (item: FeedItem, mode: 'comment' | 'repost') => void
    } = { openStatus: vi.fn(), composeStatus: vi.fn() },
    detail = false,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenImageDialogProvider>
            <StatusCardHostProvider host={host}>
              {detail ? <DetailStatusCard status={status} /> : <StatusCard status={status} />}
            </StatusCardHostProvider>
          </GenImageDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    return host
  }

  it('routes root body navigation through the host', () => {
    const host = { openStatus: vi.fn(), composeStatus: vi.fn() }
    const status = createStatus('root')
    renderCard(status, host)

    fireEvent.click(screen.getByTestId('status-card-body'))
    expect(host.openStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }))
  })

  it('uses the quoted status as the navigation target', () => {
    const host = { openStatus: vi.fn(), composeStatus: vi.fn() }
    const quoted = createStatus('quoted')
    renderCard(createStatus('root', { retweetedStatus: quoted }), host)

    const quotedCard = screen.getAllByTestId('status-card-body')[1]!
    fireEvent.click(quotedCard)

    expect(host.openStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'quoted' }))
    expect(host.openStatus).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }))
    expect(quotedCard).toHaveClass('border-0', 'shadow-none', 'bg-muted/55')
  })

  it('composes against the action target', () => {
    const host = { openStatus: vi.fn(), composeStatus: vi.fn() }
    const status = createStatus('root')
    renderCard(status, host)

    fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
    fireEvent.click(screen.getByRole('button', { name: '转发微博' }))

    expect(host.composeStatus).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'root' }),
      'comment',
    )
    expect(host.composeStatus).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'root' }),
      'repost',
    )
  })

  it('gives the primary action buttons a larger touch target', () => {
    renderCard(createStatus('root'))

    for (const label of ['回复微博', '转发微博', '点赞微博']) {
      expect(screen.getByRole('button', { name: label })).toHaveClass('h-10')
    }
  })

  it('opens a quoted comment in Weibo mode without changing the root target', () => {
    getAppSettingsStore().setState({ feedInteractionMode: 'weibo' })
    const host = { openStatus: vi.fn(), composeStatus: vi.fn() }
    const quoted = createStatus('quoted')
    renderCard(createStatus('root', { retweetedStatus: quoted }), host)

    const quotedCard = screen.getAllByTestId('status-card-body')[1]!
    fireEvent.click(within(quotedCard).getByRole('button', { name: '回复微博' }))

    expect(host.openStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'quoted' }))
    expect(host.composeStatus).not.toHaveBeenCalled()
  })

  it('loads long text through the public data seam', async () => {
    vi.mocked(loadStatusLongText).mockResolvedValueOnce({ longTextContent: 'expanded body' })
    const status = createStatus('long', { isLongText: true, text: 'preview body' })
    renderCard(status)

    fireEvent.click(screen.getByRole('button', { name: '阅读全文' }))
    await waitFor(() => expect(screen.getByText('expanded body')).toBeInTheDocument())
    expect(loadStatusLongText).toHaveBeenCalledWith('mlong')
  })

  it('uses the public mutation seam for likes', async () => {
    renderCard(createStatus('like', { liked: false }))

    fireEvent.click(screen.getByRole('button', { name: '点赞微博' }))
    await waitFor(() => expect(setStatusLike).toHaveBeenCalledWith('like'))
  })

  it('keeps inline comments local to root cards in Weibo mode', () => {
    getAppSettingsStore().setState({ feedInteractionMode: 'weibo' })
    renderCard(createStatus('root'))

    const button = screen.getByRole('button', { name: '展开精选评论' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('adapts detail presentation without exposing a surface prop', () => {
    const host = { openStatus: vi.fn(), composeStatus: vi.fn() }
    renderCard(createStatus('detail'), host, true)

    expect(screen.getByTestId('status-card-body')).not.toHaveAttribute('role', 'link')
    fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
    expect(host.composeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'detail' }),
      'comment',
    )
  })
})
