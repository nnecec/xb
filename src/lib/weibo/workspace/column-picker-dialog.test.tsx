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
    document.body.innerHTML =
      '<div class="woo-box-flex woo-tab-nav woo-tab-nav"><span></span><span></span><span></span><span></span><a href="/u/42">我</a></div>'
  })

  it('adds columns with explicit buttons and keeps the dialog open', async () => {
    const user = userEvent.setup()
    const store = getWorkspaceStore()
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

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '添加探索列' }))
    await user.click(screen.getByRole('button', { name: '添加探索列' }))

    expect(store.getState().auxiliaryColumns).toHaveLength(2)
    expect(store.getState().auxiliaryColumns[0]?.source).toEqual({ kind: 'explore' })
    expect(store.getState().auxiliaryColumns[1]?.source).toEqual({ kind: 'explore' })
    expect(screen.getByText('已添加 2 列')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('offers the combined saved column', async () => {
    const user = userEvent.setup()
    const store = getWorkspaceStore()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ColumnPickerDialog
          open
          onOpenChange={vi.fn()}
          primaryPage={{ kind: 'home', tab: 'for-you' }}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: '添加我的收藏 / 我的赞列' }))

    expect(store.getState().auxiliaryColumns[0]?.source).toEqual({
      kind: 'saved',
      uid: '42',
    })
  })
})
