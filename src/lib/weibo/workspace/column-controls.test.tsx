import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PageRuntimeProvider, type PageRuntime } from '@/lib/weibo/app/page-runtime'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'

import {
  ColumnToolbarDragProvider,
  ColumnToolbarDragRegion,
  ColumnToolbarMenuButton,
  ColumnToolbarMenuItem,
} from './column-controls'
import { ColumnPageChromeProvider, useColumnPageRefresh } from './column-page-toolbar'

function RefreshRegistration() {
  useColumnPageRefresh(() => {}, false)
  return null
}

function renderToolbar(runtime: Pick<PageRuntime, 'scrollToTop'> & Partial<PageRuntime>) {
  const scrollRootRef = { current: document.createElement('div') }
  render(
    <PageRuntimeProvider
      runtime={{
        page: { kind: 'home', tab: 'for-you' },
        navigationMode: 'column',
        scrollRootRef,
        navigate: vi.fn(),
        openStatus: vi.fn(),
        canGoBack: false,
        back: vi.fn(),
        resetScroll: vi.fn(),
        scrollToTop: runtime.scrollToTop,
      }}
    >
      <ColumnPageChromeProvider active>
        <RefreshRegistration />
        <ColumnToolbarDragProvider
          listeners={{ onPointerDown: vi.fn() }}
          setActivatorNodeRef={() => {}}
          menu={null}
        >
          <TimelineTopBar title="热搜" />
        </ColumnToolbarDragProvider>
      </ColumnPageChromeProvider>
    </PageRuntimeProvider>,
  )
  return scrollRootRef
}

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

  it('scrolls the column to the top when the toolbar title is clicked', () => {
    const scrollToTop = vi.fn()
    renderToolbar({ scrollToTop })

    fireEvent.click(screen.getByRole('heading', { name: '热搜' }))
    expect(scrollToTop).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '刷新' })).toBeEnabled()
  })

  it('keeps the refresh button from scrolling the column', () => {
    const scrollToTop = vi.fn()
    renderToolbar({ scrollToTop })

    fireEvent.click(screen.getByRole('button', { name: '刷新' }))
    expect(scrollToTop).not.toHaveBeenCalled()
  })
})
