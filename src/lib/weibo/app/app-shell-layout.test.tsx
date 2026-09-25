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
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
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

  it('keeps the back-to-top button available in the workspace', () => {
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
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

    expect(screen.getByRole('button', { name: '返回顶部' })).toBeInTheDocument()
  })

  it('scrolls the main column when the pointer is over blank workspace space', () => {
    const mainRef = createRef<HTMLDivElement>()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShellFrame
            pageKind="home"
            viewingProfileUserId={null}
            rewriteEnabled
            theme="system"
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

    const main = document.querySelector<HTMLDivElement>('[data-primary-column] .xb-column-scroll')
    const gutter = document.querySelector('[data-column-canvas] > div')
    expect(main).not.toBeNull()
    expect(gutter).not.toBeNull()
    Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 900 })
    Object.defineProperty(main, 'clientHeight', { configurable: true, value: 300 })
    main!.scrollTop = 12

    expect(fireEvent.wheel(gutter!, { deltaY: 30 })).toBe(false)
    expect(main!.scrollTop).toBe(42)

    expect(fireEvent.wheel(main!, { deltaY: 30 })).toBe(true)
    expect(main!.scrollTop).toBe(42)
  })
})
