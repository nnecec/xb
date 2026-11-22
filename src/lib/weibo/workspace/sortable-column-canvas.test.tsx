import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ColumnDragPreview,
  copyColumnDragPreviewState,
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
  { id: 'first', source: { kind: 'home', tab: 'for-you' }, width: 300 },
  { id: 'second', source: { kind: 'home', tab: 'following' }, width: 600 },
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

describe('column drag preview', () => {
  it('snapshots the whole column, including typed text', () => {
    const source = document.createElement('div')
    const section = document.createElement('section')
    section.dataset.auxiliaryColumn = ''
    section.id = 'column-live'
    section.style.opacity = '0.35'
    const text = document.createElement('p')
    text.textContent = '整列内容'
    const input = document.createElement('input')
    section.append(text, input)
    source.append(section)
    document.body.append(source)
    input.value = '已输入'

    const { unmount } = render(<ColumnDragPreview source={source} />)

    const preview = document.querySelector<HTMLElement>(
      '[data-column-drag-preview] [data-auxiliary-column]',
    )
    expect(preview).toHaveTextContent('整列内容')
    expect(preview).toHaveStyle({ opacity: '1', width: '100%', height: '100%' })
    expect(preview).toHaveAttribute('aria-hidden', 'true')
    expect(preview).toHaveAttribute('inert')
    expect(preview).not.toHaveAttribute('id')
    expect(preview?.querySelector('input')).toHaveValue('已输入')
    expect(section).toHaveStyle({ opacity: '0.35' })
    expect(section).toHaveAttribute('id', 'column-live')

    unmount()
    expect(document.querySelector('[data-column-drag-preview]')).not.toBeInTheDocument()
    source.remove()
  })

  it('copies nested scroll offsets onto the preview', () => {
    const source = document.createElement('div')
    const clone = document.createElement('div')
    const sourceChild = document.createElement('div')
    const cloneChild = document.createElement('div')
    source.append(sourceChild)
    clone.append(cloneChild)
    let sourceTop = 120
    let cloneTop = 0
    Object.defineProperty(sourceChild, 'scrollTop', {
      configurable: true,
      get: () => sourceTop,
      set: (value: number) => {
        sourceTop = value
      },
    })
    Object.defineProperty(cloneChild, 'scrollTop', {
      configurable: true,
      get: () => cloneTop,
      set: (value: number) => {
        cloneTop = value
      },
    })

    copyColumnDragPreviewState(source, clone)

    expect(cloneTop).toBe(120)
  })
})

describe('sortable column canvas', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('resizes the primary column with the handle and keyboard', async () => {
    const onMainWidthChange = vi.fn(async () => {})
    render(
      <SortableColumnCanvas
        auxiliaryColumns={[]}
        columnWidthPx={600}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
        onMainWidthChange={onMainWidthChange}
      >
        主列
      </SortableColumnCanvas>,
    )

    const handle = screen.getByRole('separator', { name: '调整主列宽' })
    expect(handle).toHaveAttribute('aria-valuenow', '600')
    fireEvent.pointerDown(handle, { button: 0, isPrimary: true, pointerId: 1, clientX: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 200 })
    fireEvent.pointerUp(handle, { pointerId: 1 })
    expect(handle).toHaveAttribute('aria-valuenow', '700')
    expect(onMainWidthChange).toHaveBeenCalledWith(700)
    fireEvent.keyDown(handle, { key: 'End' })
    expect(handle).toHaveAttribute('aria-valuenow', '720')
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
    const scrollTo = vi.fn()
    canvas.scrollBy = scrollBy
    canvas.scrollTo = scrollTo
    const track = canvas.firstElementChild!
    Array.from(track.children).forEach((item, index) => {
      item.getBoundingClientRect = () => {
        const left = 100 + index * 432 - canvas.scrollLeft
        const width = index === 2 ? 600 : 420
        return {
          left,
          right: left + width,
          top: 0,
          bottom: 600,
          width,
          height: 600,
          x: left,
          y: 0,
          toJSON: () => {},
        } as DOMRect
      }
    })
    canvas.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 600,
        top: 0,
        bottom: 600,
        width: 500,
        height: 600,
        x: 100,
        y: 0,
        toJSON: () => {},
      }) as DOMRect
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 500 },
      scrollWidth: { configurable: true, value: 1_300 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    })
    fireEvent.scroll(canvas)

    expect(screen.getByRole('button', { name: '向左滚动一列' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '向右滚动一列' }))
    expect(scrollBy).not.toHaveBeenCalled()
    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'auto', left: 432 })

    canvas.scrollLeft = 800
    fireEvent.scroll(canvas)
    fireEvent.click(screen.getByRole('button', { name: '向左滚动一列' }))
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: 'auto', left: 0 })
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

  it('restores the remembered horizontal scroll without writing it back', () => {
    vi.useFakeTimers()
    const onCanvasScrollLeftChange = vi.fn()
    const elementPrototype = HTMLElement.prototype
    const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(elementPrototype, 'scrollWidth')
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(elementPrototype, 'clientWidth')
    Object.defineProperty(elementPrototype, 'scrollWidth', { configurable: true, get: () => 1_300 })
    Object.defineProperty(elementPrototype, 'clientWidth', { configurable: true, get: () => 500 })
    render(
      <SortableColumnCanvas
        auxiliaryColumns={columns}
        focusedColumnId={null}
        shouldReduceMotion
        assignMainScrollRef={() => {}}
        contentMainRef={{ current: null }}
        canvasScrollLeft={240}
        onCanvasScrollLeftChange={onCanvasScrollLeftChange}
      >
        主列
      </SortableColumnCanvas>,
    )

    const canvas = document.querySelector<HTMLDivElement>('[data-column-canvas]')!
    expect(canvas.scrollLeft).toBe(240)
    expect(onCanvasScrollLeftChange).not.toHaveBeenCalled()

    canvas.scrollLeft = 80
    fireEvent.scroll(canvas)
    canvas.scrollLeft = 120
    fireEvent.scroll(canvas)
    expect(onCanvasScrollLeftChange).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(onCanvasScrollLeftChange).toHaveBeenCalledTimes(1)
    expect(onCanvasScrollLeftChange).toHaveBeenCalledWith(120)
    vi.useRealTimers()
    if (scrollWidthDescriptor)
      Object.defineProperty(elementPrototype, 'scrollWidth', scrollWidthDescriptor)
    if (clientWidthDescriptor)
      Object.defineProperty(elementPrototype, 'clientWidth', clientWidthDescriptor)
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
