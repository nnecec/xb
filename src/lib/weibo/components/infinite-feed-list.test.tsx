import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import type { FeedItem } from '@/lib/weibo/models/feed'

vi.mock('@/lib/weibo/components/feed-card', () => ({
  FeedCard: ({ item }: { item: FeedItem }) => <article>{item.text}</article>,
}))

vi.mock('@/lib/weibo/rating/xb-rating', () => ({
  useFeedRatingBatchSync: vi.fn(),
}))

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

function createFeedItem(id: string, text: string): FeedItem {
  return {
    id,
    mblogId: id,
    isLongText: false,
    author: { id: 'author', name: 'Alice', avatarUrl: null },
    text,
    createdAt: '',
    createdAtLabel: '',
    stats: { likes: 0, comments: 0, reposts: 0 },
    images: [],
    media: null,
  }
}

describe('InfiniteFeedList', () => {
  beforeEach(() => {
    TestIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
  })

  it('renders loading and error states through one interface', () => {
    const { rerender } = render(
      <InfiniteFeedList
        pages={undefined}
        emptyLabel="空"
        loadingLabel="加载中"
        errorMessage={null}
        isLoading={true}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('加载中')).toBeInTheDocument()

    rerender(
      <InfiniteFeedList
        pages={undefined}
        emptyLabel="空"
        loadingLabel="加载中"
        errorMessage="boom"
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('renders empty and populated feed pages', () => {
    const { rerender } = render(
      <InfiniteFeedList
        pages={[{ items: [] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('暂无内容')).toBeInTheDocument()

    rerender(
      <InfiniteFeedList
        pages={[{ items: [createFeedItem('1', '第一条'), createFeedItem('2', '第二条')] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('第一条')).toBeInTheDocument()
    expect(screen.getByText('第二条')).toBeInTheDocument()
  })

  it('fetches the next page when the sentinel intersects', () => {
    const fetchNextPage = vi.fn()
    render(
      <InfiniteFeedList
        pages={[{ items: [createFeedItem('1', '第一条')] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />,
    )

    TestIntersectionObserver.instances[0]?.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      TestIntersectionObserver.instances[0] as unknown as IntersectionObserver,
    )

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('does not fetch the next page while a next page is already loading', () => {
    const fetchNextPage = vi.fn()
    render(
      <InfiniteFeedList
        pages={[{ items: [createFeedItem('1', '第一条')] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={true}
        fetchNextPage={fetchNextPage}
      />,
    )

    TestIntersectionObserver.instances[0]?.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      TestIntersectionObserver.instances[0] as unknown as IntersectionObserver,
    )

    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  it('shows full error when errorMessage is set and there are no items', () => {
    render(
      <InfiniteFeedList
        pages={undefined}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage="initial boom"
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('initial boom')).toBeInTheDocument()
    expect(screen.getByText('页面加载失败')).toBeInTheDocument()
    expect(screen.queryByText('暂无内容')).not.toBeInTheDocument()
  })

  it('keeps feed visible when loadMoreErrorMessage is set with items', () => {
    render(
      <InfiniteFeedList
        pages={[{ items: [createFeedItem('1', '已加载内容')] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        loadMoreErrorMessage="load more boom"
        isLoading={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    )

    expect(screen.getByText('已加载内容')).toBeInTheDocument()
    expect(screen.getByText('load more boom')).toBeInTheDocument()
    expect(screen.getByText('加载失败，点击重试')).toBeInTheDocument()
    expect(screen.queryByText('页面加载失败')).not.toBeInTheDocument()
  })

  it('does not hide the list when load-more fails', async () => {
    const user = userEvent.setup()
    const fetchNextPage = vi.fn()
    render(
      <InfiniteFeedList
        pages={[{ items: [createFeedItem('1', '保留列表')] }]}
        emptyLabel="暂无内容"
        loadingLabel="加载中"
        errorMessage={null}
        loadMoreErrorMessage="next page failed"
        isLoading={false}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />,
    )

    expect(screen.getByText('保留列表')).toBeInTheDocument()
    expect(screen.getByText('next page failed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '加载失败，点击重试' }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })
})
