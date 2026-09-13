import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  ColumnToolbarDragProvider,
  ColumnToolbarDragRegion,
  ColumnToolbarMenuButton,
  ColumnToolbarMenuItem,
} from './column-controls'

describe('column toolbar dragging', () => {
  it('keeps the menu and its items interactive without starting a drag', () => {
    const onPointerDown = vi.fn()
    const onSelect = vi.fn()
    render(
      <ColumnToolbarDragProvider
        listeners={{ onPointerDown }}
        setActivatorNodeRef={() => {}}
        menu={<ColumnToolbarMenuItem onSelect={onSelect}>删除列</ColumnToolbarMenuItem>}
      >
        <ColumnToolbarDragRegion>
          <div data-testid="toolbar">
            <button type="button">其他按钮</button>
            <ColumnToolbarMenuButton />
          </div>
        </ColumnToolbarDragRegion>
      </ColumnToolbarDragProvider>,
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: '其他按钮' }), { button: 0 })
    fireEvent.pointerDown(screen.getByRole('button', { name: '列操作' }), {
      button: 0,
      ctrlKey: false,
    })
    const item = screen.getByRole('menuitem', { name: '删除列' })
    fireEvent.pointerDown(item, { button: 0 })
    expect(onPointerDown).not.toHaveBeenCalled()
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledOnce()

    fireEvent.pointerDown(screen.getByTestId('toolbar'), { button: 0, pointerId: 1 })
    expect(onPointerDown).toHaveBeenCalledOnce()
  })
})
