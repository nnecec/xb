import { DndContext } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AppShellContextProvider,
  type AppShellContextValue,
} from '@/lib/weibo/app/app-shell-context'
import { AuxiliaryColumnView } from '@/lib/weibo/workspace/auxiliary-column'
import {
  getWorkspaceStore,
  resetWorkspaceStoreForTest,
  WORKSPACE_STORAGE_KEY,
  type AuxiliaryColumn,
  type ColumnSource,
  type WorkspaceStore,
} from '@/lib/weibo/workspace/workspace-store'

vi.mock('@/lib/weibo/pages/home-timeline-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    HomeTimelinePage: () => {
      const runtime = usePageRuntime()
      const controls = useColumnControls()
      const tab = runtime.page.kind === 'home' ? runtime.page.tab : ''
      return (
        <div>
          {controls}
          <p>首页 {tab}</p>
          <button type="button" onClick={() => runtime.navigate('/u/42')}>
            打开用户
          </button>
          <button type="button" onClick={() => runtime.navigate('/at/weibo')}>
            打开通知
          </button>
          <button
            type="button"
            onClick={() =>
              runtime.openStatus({
                id: '1',
                mblogId: 'mblog-1',
                author: { id: '5', name: 'A', avatarUrl: null },
              })
            }
          >
            打开详情
          </button>
          <a href="/topic?q=%E6%B5%8B%E8%AF%95">话题链接</a>
          <a href="/100/200">微博链接</a>
          <a href="/u/page/follow/7?tab=fans">粉丝链接</a>
          <a href="/settings">设置链接</a>
        </div>
      )
    },
  }
})

vi.mock('@/lib/weibo/pages/profile-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    ProfileColumnPage: ({ source }: { source: { profileId: string } }) => {
      const runtime = usePageRuntime()
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>用户 {source.profileId}</p>
          <a href="/topic?q=%E4%B8%8B%E4%B8%80%E9%A1%B5">下一话题</a>
          <button type="button" onClick={() => runtime.navigate('/u/page/fav/9')}>
            打开收藏
          </button>
        </div>
      )
    },
    ProfilePage: () => null,
  }
})

vi.mock('@/lib/weibo/pages/topic-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    TopicPage: () => {
      const page = usePageRuntime().page
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>话题 {page.kind === 'topic' ? page.topic : ''}</p>
        </div>
      )
    },
  }
})

vi.mock('@/lib/weibo/pages/status-detail-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    StatusDetailPage: () => {
      const runtime = usePageRuntime()
      const page = runtime.page
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>微博 {page.kind === 'status' ? page.statusId : ''}</p>
          <button type="button" onClick={() => runtime.back()}>
            详情返回
          </button>
        </div>
      )
    },
  }
})

vi.mock('@/lib/weibo/pages/notifications-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    NotificationsPage: () => {
      const runtime = usePageRuntime()
      const page = runtime.page
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>通知 {page.kind === 'notifications' ? page.tab : ''}</p>
          <button type="button" onClick={() => runtime.navigate('/comment/inbox')}>
            切换评论
          </button>
        </div>
      )
    },
  }
})

vi.mock('@/lib/weibo/pages/favorites-page', async () => {
  const { usePageRuntime } = await import('@/lib/weibo/app/page-runtime')
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    FavoritesPage: () => {
      const page = usePageRuntime().page
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>收藏 {page.kind === 'favorites' ? page.uid : ''}</p>
        </div>
      )
    },
  }
})

vi.mock('@/lib/weibo/pages/follow-fans-page', async () => {
  const { useColumnControls } = await import('@/lib/weibo/workspace/column-controls')
  return {
    FollowFansContent: ({ uid, tab }: { uid: string; tab: string }) => {
      const controls = useColumnControls()
      return (
        <div>
          {controls}
          <p>
            关系 {uid} {tab}
          </p>
        </div>
      )
    },
    FollowFansPage: () => null,
  }
})

vi.mock('@/lib/weibo/components/hotsearch-list', () => ({
  HotSearchCard: () => <p>热搜列表</p>,
}))
vi.mock('@/lib/weibo/pages/explore-page', () => ({ ExplorePage: () => null }))
vi.mock('@/lib/weibo/pages/liked-statuses-page', () => ({ LikedStatusesPage: () => null }))
vi.mock('@/lib/weibo/pages/history-page', () => ({ HistoryPage: () => null }))

const shellContext: AppShellContextValue = {
  composeTarget: null,
  setComposeTarget: vi.fn(),
  viewingProfileUserId: null,
  onProfileUserIdChange: vi.fn(),
  onHomeTabChange: vi.fn(),
  refreshTimeline: vi.fn(),
  onFollowGroupChange: vi.fn(),
}

function renderColumn(
  source: ColumnSource,
  columnOverrides: Partial<{ width: number; lastLocation: AuxiliaryColumn['lastLocation'] }> = {},
) {
  return render(
    <AppShellContextProvider value={shellContext}>
      <DndContext>
        <SortableContext items={['column-1']} strategy={horizontalListSortingStrategy}>
          <AuxiliaryColumnView
            column={{ id: 'column-1', source, ...columnOverrides }}
            columnWidthPx={420}
            index={0}
            columnCount={1}
            sortingDisabled
            shouldReduceMotion
            onMove={vi.fn()}
            onRemove={vi.fn()}
          />
        </SortableContext>
      </DndContext>
    </AppShellContextProvider>,
  )
}

function createMemoryStorage(initial: unknown = undefined) {
  const values = new Map<string, unknown>(
    initial === undefined ? [] : [[WORKSPACE_STORAGE_KEY, initial]],
  )
  return {
    get: async (key: string) => ({ [key]: values.get(key) }),
    set: async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) values.set(key, value)
    },
  }
}

describe('AuxiliaryColumnView navigation', () => {
  let workspace: WorkspaceStore

  beforeEach(async () => {
    vi.clearAllMocks()
    resetWorkspaceStoreForTest()
    workspace = getWorkspaceStore(createMemoryStorage())
    await workspace.getState().hydrate()
  })

  it('forgets a hot search detail after returning to the list', async () => {
    const user = userEvent.setup()
    resetWorkspaceStoreForTest()
    workspace = getWorkspaceStore(
      createMemoryStorage({
        version: 1,
        auxiliaryColumns: [
          {
            id: 'column-1',
            source: { kind: 'hot-search', type: 'hot' },
            lastLocation: { kind: 'topic', topic: '测试话题' },
          },
        ],
        focusedColumnId: null,
      }),
    )
    await workspace.getState().hydrate()

    const persisted = workspace.getState().auxiliaryColumns[0]!
    const { unmount } = renderColumn(persisted.source, { lastLocation: persisted.lastLocation })
    expect(screen.getByText('话题 测试话题')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getByText('热搜列表')).toBeInTheDocument()
    await waitFor(() =>
      expect(workspace.getState().auxiliaryColumns[0]?.lastLocation).toBeUndefined(),
    )

    unmount()
    const restored = workspace.getState().auxiliaryColumns[0]!
    renderColumn(restored.source, { lastLocation: restored.lastLocation })
    expect(screen.getByText('热搜列表')).toBeInTheDocument()
  })

  it('renders an accessible resize handle and persists pointer width changes', async () => {
    const onWidthChange = vi.fn(async () => {})
    render(
      <AppShellContextProvider value={shellContext}>
        <DndContext>
          <SortableContext items={['column-1']} strategy={horizontalListSortingStrategy}>
            <AuxiliaryColumnView
              column={{ id: 'column-1', source: { kind: 'home', tab: 'following' } }}
              columnWidthPx={420}
              index={0}
              columnCount={1}
              sortingDisabled
              shouldReduceMotion
              onMove={vi.fn()}
              onRemove={vi.fn()}
              onWidthChange={onWidthChange}
            />
          </SortableContext>
        </DndContext>
      </AppShellContextProvider>,
    )

    const handle = screen.getByRole('separator', { name: '调整用户分组列宽' })
    expect(handle).toHaveAttribute('aria-valuemin', '300')
    expect(handle).toHaveAttribute('aria-valuemax', '720')
    expect(handle).toHaveAttribute('aria-valuenow', '420')
    fireEvent.pointerDown(handle, { button: 0, isPrimary: true, pointerId: 1, clientX: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 260 })
    fireEvent.pointerUp(handle, { pointerId: 1 })

    await waitFor(() => expect(onWidthChange).toHaveBeenCalledWith('column-1', 580))
    expect(handle).toHaveAttribute('aria-valuenow', '580')
  })

  it('supports keyboard resizing and keeps the width within bounds', async () => {
    renderColumn({ kind: 'home', tab: 'following' }, { width: 420 })
    const handle = screen.getByRole('separator', { name: '调整用户分组列宽' })

    await userEvent.setup().click(handle)
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(handle).toHaveAttribute('aria-valuenow', '410')
    fireEvent.keyDown(handle, { key: 'Home' })
    expect(handle).toHaveAttribute('aria-valuenow', '300')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(handle).toHaveAttribute('aria-valuenow', '300')
    fireEvent.keyDown(handle, { key: 'End' })
    expect(handle).toHaveAttribute('aria-valuenow', '720')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '720')
  })

  it('opens profiles, topics, follows, and notifications inside the column', async () => {
    const user = userEvent.setup()
    renderColumn({ kind: 'home', tab: 'following' })

    expect(screen.getByText('首页 following')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '设置链接' }))
    expect(screen.getByText('首页 following')).toBeInTheDocument()
    expect(screen.queryByText('辅助列只支持在列内打开微博详情')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开用户' }))
    expect(screen.getByText('用户 42')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '下一话题' }))
    expect(screen.getByText('话题 下一页')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getByText('用户 42')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开收藏' }))
    expect(screen.getByText('收藏 9')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回' }))
    await user.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getByText('首页 following')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '话题链接' }))
    expect(screen.getByText('话题 测试')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回' }))

    await user.click(screen.getByRole('link', { name: '粉丝链接' }))
    expect(screen.getByText('关系 7 fans')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回' }))

    await user.click(screen.getByRole('button', { name: '打开通知' }))
    expect(screen.getByText('通知 mentions')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '切换评论' }))
    expect(screen.getByText('通知 comments')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回' })).not.toBeInTheDocument()
    expect(shellContext.onHomeTabChange).not.toHaveBeenCalled()
    expect(shellContext.onFollowGroupChange).not.toHaveBeenCalled()
  })

  it('opens a status detail inside the column with a toolbar back button', async () => {
    const user = userEvent.setup()
    renderColumn({ kind: 'home', tab: 'for-you' })

    await user.click(screen.getByRole('link', { name: '微博链接' }))
    expect(screen.getByText('微博 200')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '详情返回' }))
    expect(screen.getByText('首页 for-you')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开详情' }))
    expect(screen.getByText('微博 mblog-1')).toBeInTheDocument()
  })
})
