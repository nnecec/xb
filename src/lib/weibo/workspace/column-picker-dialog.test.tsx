import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ColumnPickerDialog } from '@/lib/weibo/workspace/column-picker-dialog'
import {
  getWorkspaceStore,
  resetWorkspaceStoreForTest,
} from '@/lib/weibo/workspace/workspace-store'

vi.mock('@/lib/weibo/data/weibo-data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-data')>(
    '@/lib/weibo/data/weibo-data',
  )
  return {
    ...actual,
    loadFollowGroups: vi.fn(async () => ({ groups: [], defaultGroups: {} })),
    loadExploreGroups: vi.fn(async () => []),
  }
})

describe('ColumnPickerDialog', () => {
  beforeEach(() => {
    resetWorkspaceStoreForTest()
    let stored: Record<string, unknown> = {}
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => stored),
            set: vi.fn(async (items: Record<string, unknown>) => {
              stored = { ...stored, ...items }
            }),
          },
        },
      },
    })
  })

  it('turns on a source to add it and keeps that source in the same list', async () => {
    const user = userEvent.setup()
    const store = getWorkspaceStore()
    const followingColumnId = await store.getState().addColumn({ kind: 'home', tab: 'following' })
    const onOpenChange = vi.fn()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ColumnPickerDialog
          open
          onOpenChange={onOpenChange}
          primaryPage={{ kind: 'home', tab: 'for-you' }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('switch', { name: '我关注的' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '热门' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '搜索' })).not.toBeChecked()
    expect(screen.queryByRole('heading', { name: '已添加' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: '推荐' }))

    expect(store.getState().auxiliaryColumns).toEqual([
      { id: followingColumnId, source: { kind: 'home', tab: 'following' } },
      expect.objectContaining({ source: { kind: 'home', tab: 'for-you' } }),
    ])
    expect(screen.getByRole('switch', { name: '推荐' })).toBeChecked()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('turns off a source to remove it and keeps the dialog open', async () => {
    const user = userEvent.setup()
    const store = getWorkspaceStore()
    await store.getState().addColumn({ kind: 'home', tab: 'following' })
    const onOpenChange = vi.fn()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ColumnPickerDialog
          open
          onOpenChange={onOpenChange}
          primaryPage={{ kind: 'home', tab: 'for-you' }}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('switch', { name: '我关注的' }))

    expect(store.getState().auxiliaryColumns).toEqual([])
    expect(screen.getByRole('switch', { name: '我关注的' })).not.toBeChecked()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
