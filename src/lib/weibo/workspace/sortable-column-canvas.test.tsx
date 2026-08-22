import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  reorderAuxiliaryColumns,
  SortableColumnCanvas,
} from '@/lib/weibo/workspace/sortable-column-canvas'
import type { AuxiliaryColumn } from '@/lib/weibo/workspace/workspace-store'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))

vi.mock('sonner', () => ({ toast: { error: toastError } }))

vi.mock('@/lib/weibo/workspace/auxiliary-column', () => ({
  AuxiliaryColumnView: ({
    column,
    index,
    onMove,
  }: {
    column: AuxiliaryColumn
    index: number
    onMove: (id: string, targetIndex: number) => void
  }) => (
    <div data-testid={`column-${column.id}`}>
      <button type="button" data-column-control>
        控制 {column.id}
      </button>
      <span>{column.id}</span>
      <button type="button" onClick={() => onMove(column.id, 0)}>
        移动 {column.id}
      </button>
      <span>索引 {index}</span>
    </div>
  ),
}))

const columns: AuxiliaryColumn[] = [
  { id: 'first', source: { kind: 'home', tab: 'for-you' } },
  { id: 'second', source: { kind: 'home', tab: 'following' } },
]

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('sortable column canvas', () => {
  it('moves only auxiliary columns without mutating the input', () => {
    const reordered = reorderAuxiliaryColumns(columns, 'second', 0)

    expect(reordered.map((column) => column.id)).toEqual(['second', 'first'])
    expect(columns.map((column) => column.id)).toEqual(['first', 'second'])
  })

  it('optimistically reorders once and restores the previous order when saving fails', async () => {
    const user = userEvent.setup()
    const save = deferred()
    const onMoveColumn = vi.fn(() => save.promise)

    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
        onMoveColumn={onMoveColumn}
      >
        主列
      </SortableColumnCanvas>,
    )

    await user.click(screen.getByRole('button', { name: '移动 second' }))
    expect(screen.getAllByTestId(/^column-/).map((node) => node.dataset.testid)).toEqual([
      'column-second',
      'column-first',
    ])
    expect(onMoveColumn).toHaveBeenCalledTimes(1)

    await act(async () => save.reject(new Error('storage unavailable')))

    await waitFor(() => {
      expect(screen.getAllByTestId(/^column-/).map((node) => node.dataset.testid)).toEqual([
        'column-first',
        'column-second',
      ])
    })
    expect(toastError).toHaveBeenCalledWith('无法保存列顺序，已恢复原顺序')
  })

  it('focuses a column from its content but not from header controls', () => {
    const onFocusColumn = vi.fn()

    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
        onFocusColumn={onFocusColumn}
      >
        主列
      </SortableColumnCanvas>,
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: '控制 first' }))
    expect(onFocusColumn).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByTestId('column-first').querySelector('span')!)
    expect(onFocusColumn).toHaveBeenCalledOnce()
    expect(onFocusColumn).toHaveBeenCalledWith('first')
  })
})
