import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { FeedCard } from '@/lib/weibo/components/feed-card'
import { GenImageDialogProvider } from '@/lib/weibo/components/gen-image-dialog-context'
import { loadStatusLongText } from '@/lib/weibo/data/weibo-io'
import type { FeedItem } from '@/lib/weibo/models/feed'

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    loadStatusLongText: vi.fn(),
    loadFeedComments: vi.fn().mockResolvedValue({ items: [], totalNumber: 0 }),
    setStatusLike: vi.fn().mockResolvedValue(undefined),
    cancelStatusLike: vi.fn().mockResolvedValue(undefined),
    createFavorite: vi.fn().mockResolvedValue(undefined),
    destroyFavorite: vi.fn().mockResolvedValue(undefined),
    deleteWeiboStatus: vi.fn().mockResolvedValue(undefined),
  }
})

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

vi.mock('@/lib/weibo/components/gen-image-dialog-context', async () => {
  const actual = await vi.importActual('@/lib/weibo/components/gen-image-dialog-context')
  return {
    ...actual,
    useGenImageDialog: () => ({
      openGenImage: vi.fn(),
      closeGenImage: vi.fn(),
      genImageItem: null,
    }),
  }
})

describe('FeedCard', () => {
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
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      collapseRepliesEnabled: false,
      feedInteractionMode: 'weibo',
      feedPrimaryActionOrder: ['comment', 'repost', 'like'],
      feedToolbarButtonIds: [],
      isHydrated: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  function renderCard({
    onNavigate,
    onCommentClick,
    onRepostClick,
    item,
  }: {
    onNavigate?: (item: FeedItem) => void
    onCommentClick?: (item: FeedItem) => void
    onRepostClick?: (item: FeedItem) => void
    item?: Partial<FeedItem>
  } = {}) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenImageDialogProvider>
            <FeedCard
              item={{
                id: '501',
                mblogId: 'm501',
                isLongText: true,
                text: 'preview content',
                createdAt: '2024-01-01',
                createdAtLabel: 'today',
                author: { id: '1', name: 'Alice', avatarUrl: null },
                stats: { likes: 1, comments: 2, reposts: 3 },
                images: [],
                media: null,
                regionName: '',
                source: '',
                ...item,
              }}
              onNavigate={onNavigate}
              onCommentClick={onCommentClick}
              onRepostClick={onRepostClick}
            />
          </GenImageDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('allows retrying long text after the first request fails', async () => {
    const loadStatusLongTextMock = vi.mocked(loadStatusLongText)
    loadStatusLongTextMock
      .mockRejectedValueOnce(new Error('network-error'))
      .mockResolvedValueOnce({ longTextContent: 'expanded post content' })

    renderCard()

    fireEvent.click(screen.getByRole('button', { name: '阅读全文' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重试全文' })).toBeInTheDocument()
    })

    expect(loadStatusLongTextMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '重试全文' }))

    await waitFor(() => {
      expect(loadStatusLongTextMock).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(screen.getByText('expanded post content')).toBeInTheDocument()
    })
  })

  it('automatically loads long text after a timeline card enters the viewport', async () => {
    class TestIntersectionObserver {
      static instances: TestIntersectionObserver[] = []

      constructor(readonly callback: IntersectionObserverCallback) {
        TestIntersectionObserver.instances.push(this)
      }

      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    }

    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
    const store = getAppSettingsStore()
    store.setState({ autoLoadLongText: true })
    vi.mocked(loadStatusLongText).mockResolvedValueOnce({ longTextContent: '自动展开的正文' })

    renderCard()

    expect(vi.mocked(loadStatusLongText)).not.toHaveBeenCalled()

    TestIntersectionObserver.instances[0]?.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      TestIntersectionObserver.instances[0] as unknown as IntersectionObserver,
    )

    await waitFor(() => {
      expect(screen.getByText('自动展开的正文')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: '阅读全文' })).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('applies avatar visibility and folds media without removing access', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardShowAvatar: false,
      weiboCardMediaDisplay: 'collapsed',
    })

    renderCard({
      item: {
        author: { id: '1', name: 'Alice', avatarUrl: 'https://example.com/avatar.jpg' },
        text: 'preview content http://t.cn/inline-image',
        images: [
          {
            id: 'image-1',
            thumbnailUrl: 'https://example.com/thumbnail.jpg',
            largeUrl: 'https://example.com/large.jpg',
          },
        ],
        mixMediaInfo: [
          {
            id: 'video-1',
            type: 'video',
            videoCoverUrl: 'https://example.com/video-cover.jpg',
          },
        ],
        imageEntities: {
          'http://t.cn/inline-image': [
            {
              id: 'inline-image',
              thumbnailUrl: 'https://example.com/inline-thumbnail.jpg',
              largeUrl: 'https://example.com/inline-large.jpg',
            },
          ],
        },
      },
    })

    expect(screen.queryByRole('img', { name: 'Alice' })).not.toBeInTheDocument()
    expect(document.querySelector('img[src="https://example.com/thumbnail.jpg"]')).toBeNull()
    expect(document.querySelector('img[src="https://example.com/video-cover.jpg"]')).toBeNull()
    expect(document.querySelector('img[src="https://example.com/inline-thumbnail.jpg"]')).toBeNull()
    expect(screen.getByText('preview content')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '此微博包含 2 项媒体，点击显示' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '此微博包含 1 张图片，点击显示' }),
    ).toBeInTheDocument()
  })

  it('applies author metadata, title, and interaction count visibility', () => {
    getAppSettingsStore().setState({
      weiboCardShowAvatar: false,
      weiboCardShowTimestamp: false,
      weiboCardShowPublishInfo: false,
      weiboCardShowTitleBadge: false,
      weiboCardShowInteractionCounts: false,
    })

    renderCard({
      item: {
        author: { id: '1', name: 'Alice', avatarUrl: 'https://example.com/avatar.jpg' },
        createdAtLabel: '刚刚',
        source: 'iPhone 客户端',
        regionName: '发布于 北京',
        title: { text: '热门微博' },
      },
    })

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Alice' })).not.toBeInTheDocument()
    expect(screen.queryByText('刚刚')).not.toBeInTheDocument()
    expect(screen.queryByText('iPhone 客户端 发布于 北京')).not.toBeInTheDocument()
    expect(screen.queryByText('热门微博')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开精选评论' })).toHaveTextContent('')
    expect(screen.getByRole('button', { name: '转发微博' })).toHaveTextContent('')
    expect(screen.getByRole('button', { name: '点赞微博' })).toHaveTextContent('')
  })

  it('renders long text entities and images from the expanded payload', async () => {
    vi.mocked(loadStatusLongText).mockResolvedValueOnce({
      longTextContent: '#话题# 展开正文 http://t.cn/REAL http://t.cn/IMG',
      longTextContent_raw: '#话题# 展开正文 http://t.cn/REAL http://t.cn/IMG',
      topic_struct: [{ topic_title: '话题' }],
      url_struct: [
        {
          short_url: 'http://t.cn/REAL',
          url_title: '真实链接',
          long_url: 'https://weibo.com/real-link',
          url_type: 39,
        },
        {
          short_url: 'http://t.cn/IMG',
          url_title: '查看图片',
          long_url: 'https://photo.weibo.com/example',
          ori_url: 'https://photo.weibo.com/example',
          h5_target_url: 'https://photo.weibo.com/example?h5=1',
          url_type: 39,
          pic_ids: ['pic1'],
          pic_infos: {
            pic1: {
              thumbnail: { url: 'https://wx3.sinaimg.cn/thumbnail/pic1.jpg' },
              large: { url: 'https://wx3.sinaimg.cn/large/pic1.jpg' },
              woriginal: { url: 'https://wx3.sinaimg.cn/woriginal/pic1.jpg' },
            },
          },
        },
      ],
    })

    renderCard()

    fireEvent.click(screen.getByRole('button', { name: '阅读全文' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '#话题#' })).toHaveAttribute(
        'href',
        '/topic?q=%E8%AF%9D%E9%A2%98',
      )
    })

    expect(screen.getByRole('link', { name: '真实链接' })).toHaveAttribute(
      'href',
      'https://weibo.com/real-link',
    )
    expect(
      document.querySelector('img[src="https://wx3.sinaimg.cn/large/pic1.jpg"]'),
    ).not.toBeNull()
    expect(screen.queryByText('http://t.cn/IMG')).not.toBeInTheDocument()
  })

  it('renders truncated markdown before loading full text and keeps markdown after expansion', async () => {
    vi.mocked(loadStatusLongText).mockResolvedValueOnce({
      longTextContent: '# Full<br />**body**',
      longTextContent_raw: '# Full\n\n**body**',
    })

    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenImageDialogProvider>
            <FeedCard
              item={{
                id: 'md-501',
                mblogId: 'm-md-501',
                isLongText: true,
                isMarkdown: true,
                markdownText: '# Preview\n\n**truncated**',
                text: '# Preview\n\n**truncated**',
                createdAt: '2024-01-01',
                createdAtLabel: 'today',
                author: { id: '1', name: 'Alice', avatarUrl: null },
                stats: { likes: 1, comments: 2, reposts: 3 },
                images: [],
                media: null,
                regionName: '',
                source: '',
              }}
            />
          </GenImageDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Preview' })).toBeInTheDocument()
    expect(screen.getByText('truncated').tagName.toLowerCase()).toBe('strong')

    fireEvent.click(screen.getByRole('button', { name: '阅读全文' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Full' })).toBeInTheDocument()
    })
    expect(screen.getByText('body').tagName.toLowerCase()).toBe('strong')
  })

  it('can switch a markdown status back to raw source text', async () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenImageDialogProvider>
            <FeedCard
              item={{
                id: 'md-502',
                mblogId: 'm-md-502',
                isLongText: false,
                isMarkdown: true,
                markdownText: '# Preview\n\n**raw marker**',
                text: '# Preview\n\n**raw marker**',
                createdAt: '2024-01-01',
                createdAtLabel: 'today',
                author: { id: '1', name: 'Alice', avatarUrl: null },
                stats: { likes: 1, comments: 2, reposts: 3 },
                images: [],
                media: null,
                regionName: '',
                source: '',
              }}
            />
          </GenImageDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '查看原文' }))

    await waitFor(() => {
      expect(document.body).toHaveTextContent('# Preview')
    })
    expect(document.body).toHaveTextContent('**raw marker**')
    expect(screen.queryByRole('heading', { level: 1, name: 'Preview' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看渲染' })).toBeInTheDocument()
  })

  it('copies plain status text from the toolbar action without navigating', async () => {
    const store = getAppSettingsStore()
    store.setState({ feedToolbarButtonIds: ['copy-text'] })
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    const copyButton = screen.getByRole('button', { name: '复制内容' })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('preview content')
    })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('copies markdown status text from the toolbar action', async () => {
    const store = getAppSettingsStore()
    store.setState({ feedToolbarButtonIds: ['copy-text'] })
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenImageDialogProvider>
            <FeedCard
              item={{
                id: 'md-copy-501',
                mblogId: 'm-md-copy-501',
                isLongText: false,
                isMarkdown: true,
                markdownText: '# Preview\n\n**markdown marker**',
                text: 'Preview markdown marker',
                createdAt: '2024-01-01',
                createdAtLabel: 'today',
                author: { id: '1', name: 'Alice', avatarUrl: null },
                stats: { likes: 1, comments: 2, reposts: 3 },
                images: [],
                media: null,
                regionName: '',
                source: '',
              }}
            />
          </GenImageDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '复制内容' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Preview\n\n**markdown marker**')
    })
  })

  it('triggers detail callback when clicking card body', () => {
    const store = getAppSettingsStore()
    store.setState({ feedInteractionMode: 'x' })
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    const cardLink = screen.getByRole('link', { name: '查看 Alice 的微博详情' })
    fireEvent.click(cardLink)

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '501',
      }),
    )
  })

  it('exposes keyboard navigation for card detail in x mode', () => {
    const store = getAppSettingsStore()
    store.setState({ feedInteractionMode: 'x' })
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    const cardLink = screen.getByRole('link', { name: '查看 Alice 的微博详情' })
    expect(cardLink).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(cardLink, { key: 'Enter' })
    fireEvent.keyDown(cardLink, { key: ' ' })

    expect(onNavigate).toHaveBeenCalledTimes(2)
    expect(onNavigate).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: '501' }))
    expect(onNavigate).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: '501' }))
  })

  it('does not trigger detail callback after dragging across card body text', () => {
    const store = getAppSettingsStore()
    store.setState({ feedInteractionMode: 'x' })
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    const text = screen.getByText('preview content')
    fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseUp(text, { button: 0, clientX: 26, clientY: 12 })
    fireEvent.click(text, { button: 0, clientX: 26, clientY: 12 })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('does not trigger card navigation when clicking comment or repost actions', () => {
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({ feedInteractionMode: 'x' })

    const onNavigate = vi.fn()
    const onCommentClick = vi.fn()
    const onRepostClick = vi.fn()
    renderCard({ onNavigate, onCommentClick, onRepostClick })

    const commentButton = screen.getByRole('button', { name: '回复微博' })
    const repostButton = screen.getByRole('button', { name: '转发微博' })

    fireEvent.click(commentButton)
    fireEvent.click(repostButton)

    expect(onNavigate).not.toHaveBeenCalled()
    expect(onCommentClick).toHaveBeenCalledWith(expect.objectContaining({ id: '501' }))
    expect(onRepostClick).toHaveBeenCalledWith(expect.objectContaining({ id: '501' }))
    expect(commentButton.className).toContain('rounded-full')
    expect(repostButton.className).toContain('rounded-full')
    expect(screen.getByRole('button', { name: '点赞微博' }).className).toContain('rounded-full')
  })

  it('renders actions and the media download menu for a retweeted status', () => {
    const store = getAppSettingsStore()
    store.setState({ feedInteractionMode: 'x' })
    const onCommentClick = vi.fn()
    const onRepostClick = vi.fn()

    renderCard({
      onCommentClick,
      onRepostClick,
      item: {
        retweetedStatus: {
          id: 'retweeted-501',
          mblogId: 'm-retweeted-501',
          isLongText: false,
          text: 'retweeted content',
          createdAt: '2024-01-01',
          createdAtLabel: 'today',
          author: { id: '2', name: 'Bob', avatarUrl: null },
          stats: { likes: 4, comments: 5, reposts: 6 },
          images: [
            {
              id: 'retweeted-image-1',
              thumbnailUrl: 'https://example.com/retweeted-thumbnail.jpg',
              largeUrl: 'https://example.com/retweeted-large.jpg',
            },
          ],
          media: null,
          regionName: '',
          source: '',
        },
      },
    })

    const retweetedCard = screen.getAllByTestId('feed-card-body')[1]!
    const commentButton = within(retweetedCard).getByRole('button', { name: '回复微博' })
    const repostButton = within(retweetedCard).getByRole('button', { name: '转发微博' })

    expect(within(retweetedCard).getByRole('button', { name: '点赞微博' })).toBeInTheDocument()

    fireEvent.click(commentButton)
    fireEvent.click(repostButton)
    const moreButton = within(retweetedCard).getByRole('button', { name: '更多操作' })
    fireEvent.pointerDown(moreButton, { button: 0, ctrlKey: false })

    expect(onCommentClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'retweeted-501' }))
    expect(onRepostClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'retweeted-501' }))
    expect(screen.getByRole('menuitem', { name: '批量下载' })).toBeInTheDocument()
  })

  it('applies the configured single image width to main and retweeted cards', () => {
    getAppSettingsStore().setState({ weiboCardSingleImageMaxWidth: 520 })

    renderCard({
      item: {
        images: [
          {
            id: 'main-image-1',
            thumbnailUrl: 'https://example.com/main-thumbnail.jpg',
            largeUrl: 'https://example.com/main-large.jpg',
          },
        ],
        retweetedStatus: {
          id: 'retweeted-width-501',
          mblogId: 'm-retweeted-width-501',
          isLongText: false,
          text: 'retweeted content',
          createdAt: '2024-01-01',
          createdAtLabel: 'today',
          author: { id: '2', name: 'Bob', avatarUrl: null },
          stats: { likes: 0, comments: 0, reposts: 0 },
          images: [
            {
              id: 'retweeted-image-1',
              thumbnailUrl: 'https://example.com/retweeted-width-thumbnail.jpg',
              largeUrl: 'https://example.com/retweeted-width-large.jpg',
            },
          ],
          media: null,
          regionName: '',
          source: '',
        },
      },
    })

    const mainImage = document.querySelector('img[src="https://example.com/main-thumbnail.jpg"]')
    const retweetedImage = document.querySelector(
      'img[src="https://example.com/retweeted-width-thumbnail.jpg"]',
    )

    expect(mainImage?.closest('.grid')).toHaveStyle({ maxWidth: '520px' })
    expect(retweetedImage?.closest('.grid')).toHaveStyle({ maxWidth: '520px' })
  })

  it('exposes inline comment expansion state when comments can expand in weibo mode', async () => {
    renderCard({})

    const commentButton = screen.getByRole('button', { name: '展开精选评论' })
    expect(commentButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(commentButton)

    await waitFor(() => {
      expect(commentButton).toHaveAttribute('aria-expanded', 'true')
    })

    const commentsPanelId = commentButton.getAttribute('aria-controls')
    expect(commentsPanelId).toBeTruthy()
    expect(document.getElementById(commentsPanelId!)).not.toBeNull()
    expect(screen.getByRole('button', { name: '收起精选评论' })).toBe(commentButton)
  })

  describe('like and favorite actions', () => {
    it('calls setStatusLike when clicking 点赞微博 on an unliked item', async () => {
      const { setStatusLike } = await import('@/lib/weibo/data/weibo-io')
      vi.mocked(setStatusLike).mockResolvedValueOnce(undefined)

      renderCard({ item: { liked: false } })

      fireEvent.click(screen.getByRole('button', { name: '点赞微博' }))

      await waitFor(() => {
        expect(vi.mocked(setStatusLike)).toHaveBeenCalledWith('501')
      })
    })

    it('calls cancelStatusLike when clicking 取消点赞 on a liked item', async () => {
      const { cancelStatusLike } = await import('@/lib/weibo/data/weibo-io')
      vi.mocked(cancelStatusLike).mockResolvedValueOnce(undefined)

      renderCard({ item: { liked: true } })

      fireEvent.click(screen.getByRole('button', { name: '取消点赞' }))

      await waitFor(() => {
        expect(vi.mocked(cancelStatusLike)).toHaveBeenCalledWith('501')
      })
    })

    it('calls createFavorite when clicking 收藏 on an unfavorited item', async () => {
      const store = getAppSettingsStore()
      store.setState({ feedToolbarButtonIds: ['favorite'] })

      const { createFavorite } = await import('@/lib/weibo/data/weibo-io')
      vi.mocked(createFavorite).mockResolvedValueOnce(undefined)

      renderCard({ item: { favorited: false } })

      fireEvent.click(screen.getByRole('button', { name: '收藏' }))

      await waitFor(() => {
        expect(vi.mocked(createFavorite)).toHaveBeenCalledWith('501')
      })
    })

    it('calls destroyFavorite when clicking 取消收藏 on a favorited item', async () => {
      const store = getAppSettingsStore()
      store.setState({ feedToolbarButtonIds: ['favorite'] })

      const { destroyFavorite } = await import('@/lib/weibo/data/weibo-io')
      vi.mocked(destroyFavorite).mockResolvedValueOnce(undefined)

      renderCard({ item: { favorited: true } })

      fireEvent.click(screen.getByRole('button', { name: '取消收藏' }))

      await waitFor(() => {
        expect(vi.mocked(destroyFavorite)).toHaveBeenCalledWith('501')
      })
    })
  })

  describe('new tab open on modifier / middle click', () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const store = getAppSettingsStore()
      store.setState({ feedInteractionMode: 'x' })
    })

    afterEach(() => {
      windowOpenSpy.mockRestore()
    })

    function getCard() {
      return screen.getByTestId('feed-card-body')
    }

    it('opens status detail in a new tab on cmd + left click', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      fireEvent.click(getCard(), { button: 0, metaKey: true })

      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${window.location.origin}/1/m501`,
        '_blank',
        'noopener,noreferrer',
      )
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('opens status detail in a new tab on ctrl + left click', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      fireEvent.click(getCard(), { button: 0, ctrlKey: true })

      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${window.location.origin}/1/m501`,
        '_blank',
        'noopener,noreferrer',
      )
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('opens status detail in a new tab on middle click', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      fireEvent(getCard(), new MouseEvent('auxclick', { button: 1, bubbles: true }))

      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${window.location.origin}/1/m501`,
        '_blank',
        'noopener,noreferrer',
      )
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('does not open a new tab when modifier + click target is an interactive child', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      const commentButton = screen.getByRole('button', { name: '回复微博' })
      fireEvent.click(commentButton, { button: 0, metaKey: true })

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('does not open a new tab when middle click target is an interactive child', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      const moreButton = screen.getByRole('button', { name: '更多操作' })
      fireEvent(moreButton, new MouseEvent('auxclick', { button: 1, bubbles: true }))

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('does not open a new tab on cmd + left click when text is selected', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      const text = screen.getByText('preview content')
      const selection = {
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => ({
          commonAncestorContainer: text,
        }),
      }
      const selectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue(selection as never)

      fireEvent.click(getCard(), { button: 0, metaKey: true })

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).not.toHaveBeenCalled()
      selectionSpy.mockRestore()
    })

    it('does not open a new tab on cmd + left click after a drag', () => {
      const onNavigate = vi.fn()
      renderCard({ onNavigate })

      const text = screen.getByText('preview content')
      fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.mouseUp(text, { button: 0, clientX: 26, clientY: 12 })
      fireEvent.click(getCard(), { button: 0, metaKey: true })

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('opens retweeted status detail in a new tab on cmd + click', () => {
      const queryClient = new QueryClient()
      const onNavigate = vi.fn()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      fireEvent.click(retweeted, { button: 0, metaKey: true })

      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${window.location.origin}/2/m-inner`,
        '_blank',
        'noopener,noreferrer',
      )
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('opens retweeted status detail in a new tab on middle click', () => {
      const queryClient = new QueryClient()
      const onNavigate = vi.fn()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      fireEvent(retweeted, new MouseEvent('auxclick', { button: 1, bubbles: true }))

      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${window.location.origin}/2/m-inner`,
        '_blank',
        'noopener,noreferrer',
      )
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('does not open a new tab when retweeted card body left-clicks without modifier', () => {
      const onNavigate = vi.fn()
      const queryClient = new QueryClient()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      fireEvent.click(retweeted, { button: 0 })

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'inner' }))
    })

    it('does not trigger retweeted card navigation after dragging across retweeted body text', () => {
      const onNavigate = vi.fn()
      const queryClient = new QueryClient()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post content',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      const text = within(retweeted).getByText('inner post content')

      fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.mouseUp(text, { button: 0, clientX: 26, clientY: 12 })
      fireEvent.click(retweeted, { button: 0, clientX: 26, clientY: 12 })

      expect(onNavigate).not.toHaveBeenCalled()
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('does not open a new tab for retweeted card after dragging across retweeted body text', () => {
      const onNavigate = vi.fn()
      const queryClient = new QueryClient()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post content',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      const text = within(retweeted).getByText('inner post content')

      fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.mouseUp(text, { button: 0, clientX: 26, clientY: 12 })
      fireEvent(retweeted, new MouseEvent('auxclick', { button: 1, clientX: 26, clientY: 12 }))

      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(onNavigate).not.toHaveBeenCalled()
    })

    it('still triggers retweeted card navigation on a clean click (no drag)', () => {
      const onNavigate = vi.fn()
      const queryClient = new QueryClient()

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GenImageDialogProvider>
              <FeedCard
                item={{
                  id: 'outer',
                  mblogId: 'm-outer',
                  isLongText: false,
                  text: 'outer post',
                  createdAt: '2024-01-01',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 0, comments: 0, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                  retweetedStatus: {
                    id: 'inner',
                    mblogId: 'm-inner',
                    isLongText: false,
                    text: 'inner post content',
                    createdAt: '2024-01-01',
                    createdAtLabel: 'today',
                    author: { id: '2', name: 'Bob', avatarUrl: null },
                    stats: { likes: 0, comments: 0, reposts: 0 },
                    images: [],
                    media: null,
                    regionName: '',
                    source: '',
                  },
                }}
                onNavigate={onNavigate}
              />
            </GenImageDialogProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )

      const retweeted = screen.getAllByTestId('feed-card-body')[1]!
      const text = within(retweeted).getByText('inner post content')

      fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.mouseUp(text, { button: 0, clientX: 11, clientY: 11 })
      fireEvent.click(retweeted, { button: 0, clientX: 11, clientY: 11 })

      expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'inner' }))
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })
  })
})
