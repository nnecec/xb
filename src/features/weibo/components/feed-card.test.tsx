import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FeedCard } from '@/features/weibo/components/feed-card'
import type { FeedItem } from '@/features/weibo/models/feed'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'
import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadStatusLongText: vi.fn(),
    setStatusLike: vi.fn().mockResolvedValue(undefined),
    cancelStatusLike: vi.fn().mockResolvedValue(undefined),
    deleteWeiboStatus: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/features/weibo/hooks/use-font-settings', () => ({
  useFontSettings: () => ({
    fontSizeClass: 'text-sm',
    fontFamily: '',
  }),
}))

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
  })

  function renderCard({
    onNavigate,
    onCommentClick,
    onRepostClick,
  }: {
    onNavigate?: (item: FeedItem) => void
    onCommentClick?: (item: FeedItem) => void
    onRepostClick?: (item: FeedItem) => void
  } = {}) {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FeedCard
            item={{
              id: '501',
              mblogId: 'm501',
              isLongText: true,
              text: 'preview content',
              createdAtLabel: 'today',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 1, comments: 2, reposts: 3 },
              images: [],
              media: null,
              regionName: '',
              source: '',
            }}
            onNavigate={onNavigate}
            onCommentClick={onCommentClick}
            onRepostClick={onRepostClick}
          />
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

    fireEvent.click(screen.getByRole('button', { name: '全文' }))

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

    fireEvent.click(screen.getByRole('button', { name: '全文' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '#话题#' })).toHaveAttribute(
        'href',
        'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23',
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

  it('triggers detail callback when clicking card body', () => {
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    fireEvent.click(screen.getByText('preview content'))

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '501',
      }),
    )
  })

  it('does not trigger detail callback after dragging across card body text', () => {
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    const text = screen.getByText('preview content')
    fireEvent.mouseDown(text, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseUp(text, { button: 0, clientX: 26, clientY: 12 })
    fireEvent.click(text, { button: 0, clientX: 26, clientY: 12 })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('does not trigger card navigation when clicking comment or repost actions', () => {
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
})
