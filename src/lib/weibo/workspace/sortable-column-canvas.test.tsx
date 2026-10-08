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
  it('sizes the primary column from the configured column width', () => {
    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        columnWidthPx={560}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    expect(document.querySelector('[data-primary-column]')).toHaveStyle({ width: '560px' })
    expect(document.querySelector('[data-primary-column]')).toHaveClass('border-x')
    expect(document.querySelector('[data-primary-column]')).not.toHaveClass('rounded-lg')
    expect(document.querySelector('[data-column-canvas]')).toHaveClass('xb-column-scroll')
    expect(document.querySelector('[data-primary-column] .xb-column-scroll')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '向右滚动一列' })).not.toBeInTheDocument()
  })

  it('scrolls the canvas by one column from the corner buttons', () => {
    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        columnWidthPx={420}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    const canvas = document.querySelector<HTMLDivElement>('[data-column-canvas]')!
    const scrollBy = vi.fn()
    canvas.scrollBy = scrollBy
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 500 },
      scrollWidth: { configurable: true, value: 1_300 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    })
    fireEvent.scroll(canvas)

    expect(screen.getByRole('button', { name: '向左滚动一列' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '向右滚动一列' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'auto', left: 432 })

    canvas.scrollLeft = 800
    fireEvent.scroll(canvas)
    fireEvent.click(screen.getByRole('button', { name: '向左滚动一列' }))
    expect(scrollBy).toHaveBeenLastCalledWith({ behavior: 'auto', left: -432 })
  })

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

  it('scrolls only the column canvas when focusing an auxiliary column', () => {
    const { rerender } = render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    const canvas = document.querySelector<HTMLDivElement>('[data-column-canvas]')!
    const column = screen.getByTestId('column-second').parentElement!
    const scrollTo = vi.fn()
    canvas.scrollTo = scrollTo
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 500 },
      scrollWidth: { configurable: true, value: 1_300 },
    })
    canvas.getBoundingClientRect = () => ({
      bottom: 600,
      height: 600,
      left: 100,
      right: 600,
      top: 0,
      width: 500,
      x: 100,
      y: 0,
      toJSON: () => {},
    })
    column.getBoundingClientRect = () => ({
      bottom: 600,
      height: 600,
      left: 700,
      right: 1_120,
      top: 0,
      width: 420,
      x: 700,
      y: 0,
      toJSON: () => {},
    })

    rerender(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId="second"
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'auto', left: 560 })
  })

  it('does not focus a column when its content is pressed', () => {
    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    const canvas = document.querySelector<HTMLDivElement>('[data-column-canvas]')!
    const scrollTo = vi.fn()
    canvas.scrollTo = scrollTo

    fireEvent.pointerDown(screen.getByTestId('column-first').querySelector('span')!)
    fireEvent.pointerDown(screen.getByRole('button', { name: '控制 first' }))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('keeps the column canvas from auto-scrolling while selecting text', () => {
    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
      >
        主列
      </SortableColumnCanvas>,
    )

    const canvas = document.querySelector<HTMLElement>('[data-column-canvas]')!
    const text = screen.getByText('first')
    canvas.scrollLeft = 24
    document.body.scrollLeft = 12
    fireEvent(text, new Event('selectstart', { bubbles: true }))
    canvas.scrollLeft = 180
    document.body.scrollLeft = 180
    fireEvent.scroll(canvas)

    expect(canvas.scrollLeft).toBe(24)
    expect(document.body.scrollLeft).toBe(12)
  })
})
