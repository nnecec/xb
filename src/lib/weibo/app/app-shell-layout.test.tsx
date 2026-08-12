import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import {
  getContentColumnOffset,
  scheduleContentColumnAnimation,
  ShellFrame,
  startContentColumnTransition,
} from '@/lib/weibo/app/app-shell-layout'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const animateTo = vi.fn<
  (value: unknown, target: number, options?: unknown) => { stop: () => void }
>(() => ({ stop: vi.fn() }))

vi.mock('@/lib/weibo/components/right-rail', () => ({
  RightRail: () => <div data-testid="right-rail">right rail</div>,
}))

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    animate: (value: unknown, target: number, options?: unknown) =>
      animateTo(value, target, options),
  }
})

function mockMainRect(contentMain: HTMLElement, getLeft: () => number) {
  vi.spyOn(contentMain, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width: 768,
        left: getLeft(),
        right: getLeft() + 768,
        top: 0,
        bottom: 800,
        height: 800,
        x: getLeft(),
        y: 0,
        toJSON() {
          return {}
        },
      }) as DOMRect,
  )
}

describe('ShellFrame', () => {
  beforeEach(() => {
    animateTo.mockClear()
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
      homeTab: 'for-you',
      isHydrated: true,
    })
  })

  it('calculates the transform that keeps a re-centered reading column visually stationary', () => {
    expect(getContentColumnOffset(164, 296)).toBe(-132)
    expect(getContentColumnOffset(296, 296)).toBeNull()
  })

  it('waits for a paint before returning the reading column to center', () => {
    const frames: FrameRequestCallback[] = []
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const onCenter = vi.fn()

    scheduleContentColumnAnimation(onCenter, requestFrame)

    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(onCenter).not.toHaveBeenCalled()
    expect(frames).toHaveLength(1)
    frames.shift()?.(16)
    expect(onCenter).toHaveBeenCalledOnce()
  })

  it('pins the reading column before Motion starts the centering transition', () => {
    const frames: FrameRequestCallback[] = []
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const motionX = {
      get: vi.fn(() => 0),
      set: vi.fn(),
    }
    const transition = { duration: 0.28 }
    const animateSpy = vi.fn()

    startContentColumnTransition({
      motionX,
      offset: -132,
      transition,
      animateTo: animateSpy,
      requestFrame,
    })

    expect(motionX.set).toHaveBeenCalledWith(-132)
    expect(animateSpy).not.toHaveBeenCalled()
    frames.shift()?.(0)
    frames.shift()?.(16)
    expect(animateSpy).toHaveBeenCalledWith(motionX, 0, transition)
  })

  it('renders one navigation landmark and preserves page content', () => {
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1)
    expect(screen.getByText('center content')).toBeInTheDocument()
    const skipLink = screen.getByRole('link', { name: '跳到主要内容' })
    expect(skipLink).toHaveAttribute('href', '#xb-main-content')
    fireEvent.click(skipLink)
    const contentMain = document.getElementById('xb-main-content')
    expect(contentMain).toHaveFocus()
    expect(contentMain).toHaveAttribute('tabindex', '-1')
  })

  it('keeps one fixed back-to-top button when the right rail is hidden', () => {
    getAppSettingsStore().setState({
      ...getAppSettingsStore().getState(),
      showRightRail: false,
    })
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByTestId('right-rail')).not.toBeInTheDocument()
    const backToTopButtons = screen.getAllByRole('button', { name: '返回顶部' })
    expect(backToTopButtons).toHaveLength(1)
    expect(backToTopButtons[0]).toHaveClass('fixed', 'right-4', 'bottom-4')
  })

  it('uses an exit-only rail and hides headers while scrolling in immersive mode', () => {
    getAppSettingsStore().setState({
      ...getAppSettingsStore().getState(),
      immersiveMode: true,
    })
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <TimelineTopBar title="推荐" />
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出沉浸模式' })).toBeInTheDocument()
    expect(screen.queryByTestId('right-rail')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回顶部' })).toBeInTheDocument()

    const main = mainRef.current
    expect(main).not.toBeNull()
    if (!main) return

    main.scrollTop = 40
    fireEvent.scroll(main)

    expect(
      screen.getByRole('heading', { level: 1, name: '推荐' }).closest('[class*="sticky"]'),
    ).toHaveClass('-translate-y-[calc(100%+1px)]')

    main.scrollTop = 20
    fireEvent.scroll(main)

    expect(
      screen.getByRole('heading', { level: 1, name: '推荐' }).closest('[class*="sticky"]'),
    ).not.toHaveClass('-translate-y-[calc(100%+1px)]')
  })

  it('preserves the measured reading-column width when entering immersive mode', () => {
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const contentMain = screen.getByRole('main')
    mockMainRect(contentMain, () => 164)

    fireEvent.click(screen.getByRole('button', { name: '切换沉浸模式' }))

    expect(screen.getByRole('button', { name: '退出沉浸模式' })).toBeInTheDocument()
    expect(contentMain).toHaveStyle({ maxWidth: '768px' })
  })

  it('takes shell rails out of document flow when entering immersive mode', () => {
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const contentMain = screen.getByRole('main')
    mockMainRect(contentMain, () => (getAppSettingsStore().getState().immersiveMode ? 296 : 164))

    fireEvent.click(screen.getByRole('button', { name: '切换沉浸模式' }))

    const row = contentMain.parentElement
    expect(row?.className ?? '').toContain('[&_[data-shell-rail=left]]:absolute')
    expect(document.querySelector('[data-shell-rail="left"]')).not.toBeNull()
  })

  it('pins the reading column when entering immersive mode before sliding to center', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })

    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const contentMain = screen.getByRole('main')
    mockMainRect(contentMain, () => (getAppSettingsStore().getState().immersiveMode ? 296 : 164))

    fireEvent.click(screen.getByRole('button', { name: '切换沉浸模式' }))

    expect(screen.getByRole('button', { name: '退出沉浸模式' })).toBeInTheDocument()
    // Pin applied synchronously; animate-to-center waits for double rAF
    expect(animateTo).not.toHaveBeenCalled()
    frames.shift()?.(0)
    frames.shift()?.(16)
    expect(animateTo).toHaveBeenCalled()
    expect(animateTo.mock.calls[0]?.[1]).toBe(0)
  })

  it('pins the reading column when leaving immersive mode before sliding back', () => {
    getAppSettingsStore().setState({
      ...getAppSettingsStore().getState(),
      immersiveMode: true,
    })

    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })

    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
            contentWidth="standard"
            customContentWidth={1200}
            onRewriteEnabledChange={vi.fn()}
            onThemeChange={vi.fn()}
            onSettingsOpen={vi.fn()}
            onComposeOpen={vi.fn()}
            mainRef={mainRef}
          >
            <div>center content</div>
          </ShellFrame>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const contentMain = screen.getByRole('main')
    mockMainRect(contentMain, () => (getAppSettingsStore().getState().immersiveMode ? 296 : 164))

    fireEvent.click(screen.getByRole('button', { name: '退出沉浸模式' }))

    expect(animateTo).not.toHaveBeenCalled()
    frames.shift()?.(0)
    frames.shift()?.(16)
    expect(animateTo).toHaveBeenCalled()
    expect(animateTo.mock.calls[0]?.[1]).toBe(0)
  })
})
