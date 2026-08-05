import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'

function createImages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `image-${index + 1}`,
    thumbnailUrl: `https://example.com/thumb-${index + 1}.jpg`,
    largeUrl: `https://example.com/large-${index + 1}.jpg`,
    width: 1200,
    height: 800,
  }))
}

function firePointerEvent(
  target: HTMLElement | Window,
  type: string,
  {
    button = 0,
    clientX = 0,
    pointerId,
    pointerType = 'mouse',
  }: {
    button?: number
    clientX?: number
    pointerId: number
    pointerType?: string
  },
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    button: { value: button },
    clientX: { value: clientX },
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })
  fireEvent(target, event)
}

const { photoViewClickSpy } = vi.hoisted(() => ({
  photoViewClickSpy: vi.fn(),
}))

const { reducedMotionState } = vi.hoisted(() => ({
  reducedMotionState: { current: false },
}))

const {
  emblaApi,
  emitEmblaEvent,
  resetEmblaMock,
  setEmblaSelectedIndex,
  useEmblaCarouselMock,
  wheelGesturesPluginMock,
} = vi.hoisted(() => {
  let selectedIndex = 0
  const listeners = new Map<string, Set<() => void>>()
  const emitEmblaEvent = (eventName: string) => {
    for (const listener of listeners.get(eventName) ?? []) listener()
  }
  const emblaApi = {
    off: vi.fn((eventName: string, listener: () => void) => {
      listeners.get(eventName)?.delete(listener)
    }),
    on: vi.fn((eventName: string, listener: () => void) => {
      const eventListeners = listeners.get(eventName) ?? new Set<() => void>()
      eventListeners.add(listener)
      listeners.set(eventName, eventListeners)
    }),
    scrollTo: vi.fn((index: number) => {
      selectedIndex = index
      emitEmblaEvent('select')
    }),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    selectedScrollSnap: vi.fn(() => selectedIndex),
  }
  const emblaRef = vi.fn()
  const resetEmblaMock = () => {
    selectedIndex = 0
    listeners.clear()
  }
  const setEmblaSelectedIndex = (index: number) => {
    selectedIndex = index
  }
  const useEmblaCarouselMock = vi.fn(() => [emblaRef, emblaApi])
  const wheelGesturesPluginMock = vi.fn(() => ({ name: 'wheelGestures' }))

  return {
    emblaApi,
    emblaRef,
    emitEmblaEvent,
    resetEmblaMock,
    setEmblaSelectedIndex,
    useEmblaCarouselMock,
    wheelGesturesPluginMock,
  }
})

vi.mock('embla-carousel-react', () => ({
  default: useEmblaCarouselMock,
}))

vi.mock('embla-carousel-wheel-gestures', () => ({
  WheelGesturesPlugin: wheelGesturesPluginMock,
}))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return { ...actual, useReducedMotion: () => reducedMotionState.current }
})

vi.mock('react-photo-view', () => ({
  PhotoProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PhotoView: ({
    children,
    src,
    render: renderPhoto,
  }: {
    children: ReactNode
    src?: string
    render?: (params: {
      attrs: {
        style: Record<string, never>
      }
      scale: number
    }) => ReactNode
  }) => (
    <div
      data-testid={renderPhoto ? 'photo-render' : 'photo-view'}
      data-src={src}
      onClick={photoViewClickSpy}
    >
      {children}
      {renderPhoto
        ? renderPhoto({
            attrs: {
              style: {},
            },
            scale: 1,
          })
        : null}
    </div>
  ),
}))

describe('ImageCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetEmblaMock()
    reducedMotionState.current = false
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
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      isHydrated: true,
    })
  })

  it('uses default PhotoView for long images so drag-to-pan works in the lightbox', () => {
    render(
      <ImageCarousel
        images={[
          {
            id: 'long-pic',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            largeUrl: 'https://example.com/large.jpg',
            width: 400,
            height: 2000,
          },
        ]}
      />,
    )

    expect(screen.getByText('长图')).toBeInTheDocument()
    expect(screen.getByTestId('photo-view')).toHaveAttribute(
      'data-src',
      'https://example.com/large.jpg',
    )
    expect(screen.queryByTestId('photo-render')).not.toBeInTheDocument()
  })

  it('limits a single card media item to its configured maximum width', () => {
    const { container } = render(
      <ImageCarousel images={createImages(1)} variant="card" singleMediaMaxWidth={720} />,
    )

    expect(container.querySelector('.grid')).toHaveStyle({ maxWidth: '720px' })
  })

  it('auto-plays the live photo in the lightbox and switches to replay when video ends', () => {
    render(
      <ImageCarousel
        images={[
          {
            id: 'live-pic',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            largeUrl: 'https://example.com/large.jpg',
            type: 'livephoto',
            livePhotoVideoUrl: 'https://example.com/live.mov',
          },
        ]}
      />,
    )

    // 缩略图上的 Live 徽章
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0)

    const preview = screen.getByTestId('photo-render')

    // 初次进入大图,视频自动播放(autoplay/muted/playsinline,无 controls)
    const video = preview.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('src', 'https://example.com/live.mov')
    expect(video).toHaveAttribute('poster', 'https://example.com/large.jpg')
    expect(video).not.toHaveAttribute('controls')
    expect(within(preview).getByRole('button', { name: '正在播放 Live Photo' })).toBeInTheDocument()

    // 播放结束 -> 切换到静图 + 重播按钮
    fireEvent.ended(video!)
    expect(preview.querySelector('video')).not.toBeInTheDocument()
    expect(preview.querySelector('img')).toBeInTheDocument()
    const replayButton = within(preview).getByRole('button', { name: '重新播放 Live Photo' })
    expect(replayButton).toBeInTheDocument()

    // 点击重播按钮 -> 视频再次出现
    fireEvent.click(replayButton)
    const replayedVideo = preview.querySelector('video')
    expect(replayedVideo).toBeInTheDocument()
    expect(replayedVideo).toHaveAttribute('src', 'https://example.com/live.mov')
  })

  it('limits card grids while keeping every item mounted for lightbox navigation', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'grid',
      weiboCardMultiMediaGridLimit: 6,
      weiboCardMultiMediaGridMaxWidth: 800,
    })

    const { container } = render(<ImageCarousel images={createImages(12)} variant="card" />)

    expect(screen.getByLabelText('还有 6 项媒体')).toHaveTextContent('+6')
    expect(screen.getAllByTestId('photo-view')).toHaveLength(12)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6)

    const grid = container.querySelector('.grid')
    expect(grid).toHaveStyle({ maxWidth: '800px' })
    expect(grid).toHaveClass('sm:grid-cols-3')
  })

  it('keeps shared inline media on the legacy grid', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
      weiboCardMultiMediaGridLimit: 4,
    })

    const { container } = render(<ImageCarousel images={createImages(10)} />)

    expect(screen.queryByRole('region', { name: /横向媒体画廊/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
    expect(container.querySelector('.grid')).toHaveClass('max-w-[650px]')
    expect(screen.getAllByTestId('photo-view')).toHaveLength(10)
  })

  it('configures Embla for a keyboard-accessible, variable-width horizontal strip', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
      weiboCardMultiMediaStripHeight: 480,
    })

    render(
      <ImageCarousel
        variant="card"
        images={[
          {
            id: 'portrait',
            thumbnailUrl: 'https://example.com/portrait-thumb.jpg',
            largeUrl: 'https://example.com/portrait.jpg',
            width: 400,
            height: 1200,
          },
          {
            id: 'landscape',
            thumbnailUrl: 'https://example.com/landscape-thumb.jpg',
            largeUrl: 'https://example.com/landscape.jpg',
            width: 2400,
            height: 800,
          },
        ]}
      />,
    )

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    expect(strip).toHaveStyle({ height: '480px' })
    expect(strip).toHaveClass('[touch-action:pan-y]')

    const items = strip.querySelectorAll<HTMLElement>('[data-media-strip-item]')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveStyle({ width: '360px', aspectRatio: '0.75' })
    expect(items[1]).toHaveStyle({ width: '853.333px', aspectRatio: String(16 / 9) })
    expect(useEmblaCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({
        align: 'start',
        axis: 'x',
        containScroll: 'trimSnaps',
        dragFree: true,
        loop: false,
      }),
      expect.any(Array),
    )
    expect(wheelGesturesPluginMock).toHaveBeenCalledWith({ wheelDraggingClass: '' })

    fireEvent.keyDown(strip, { key: 'Home' })
    fireEvent.keyDown(strip, { key: 'End' })
    expect(emblaApi.scrollTo).toHaveBeenNthCalledWith(1, 0)
    expect(emblaApi.scrollTo).toHaveBeenNthCalledWith(2, 1)
  })

  it('suppresses the lightbox click after an Embla drag, then resets on the next click', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
    })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!

    firePointerEvent(strip, 'pointerdown', {
      pointerId: 7,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    expect(strip).toHaveClass('cursor-grab')

    firePointerEvent(strip, 'pointermove', {
      pointerId: 7,
      pointerType: 'mouse',
      clientX: 220,
    })
    expect(strip).toHaveClass('cursor-grabbing')

    act(() => emitEmblaEvent('pointerUp'))
    expect(strip).toHaveClass('cursor-grab')

    fireEvent.click(photoView)
    expect(photoViewClickSpy).not.toHaveBeenCalled()

    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)
  })

  it('announces the Embla-selected media item after select and reInit', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    act(() => {
      setEmblaSelectedIndex(1)
      emitEmblaEvent('select')
    })
    expect(screen.getByText('当前第 2 项，共 2 项')).toBeInTheDocument()

    act(() => {
      setEmblaSelectedIndex(0)
      emitEmblaEvent('reInit')
    })
    expect(screen.getByText('当前第 1 项，共 2 项')).toBeInTheDocument()
  })

  it('does not draw a focus border around the gallery container', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    expect(strip).toHaveClass('outline-none', 'focus:outline-none', 'focus:ring-0')
    expect(strip).not.toHaveClass('focus-visible:ring-2')
  })

  it.each([
    [
      'pointercancel',
      21,
      (strip: HTMLElement, pointerId: number) =>
        firePointerEvent(strip, 'pointercancel', { pointerId }),
    ],
    [
      'lostpointercapture',
      22,
      (strip: HTMLElement, pointerId: number) =>
        firePointerEvent(strip, 'lostpointercapture', { pointerId }),
    ],
  ])('clears dragging state on %s', (_name, pointerId, finish) => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    firePointerEvent(strip, 'pointerdown', {
      pointerId,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    firePointerEvent(strip, 'pointermove', { pointerId, pointerType: 'mouse', clientX: 200 })
    expect(strip).toHaveClass('cursor-grabbing')
    finish(strip, pointerId)
    expect(strip).toHaveClass('cursor-grab')
  })

  it('clears dragging state when the window blurs or pointer releases outside', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    firePointerEvent(strip, 'pointerdown', {
      pointerId: 31,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    firePointerEvent(strip, 'pointermove', { pointerId: 31, pointerType: 'mouse', clientX: 200 })
    firePointerEvent(window, 'pointerup', { pointerId: 31 })
    expect(strip).toHaveClass('cursor-grab')
    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)

    firePointerEvent(strip, 'pointerdown', {
      pointerId: 32,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    firePointerEvent(strip, 'pointermove', { pointerId: 32, pointerType: 'mouse', clientX: 200 })
    fireEvent.blur(window)
    expect(strip).toHaveClass('cursor-grab')
  })

  it('resets drag and click suppression when horizontal layout is disabled', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    firePointerEvent(strip, 'pointerdown', {
      pointerId: 51,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    firePointerEvent(strip, 'pointermove', { pointerId: 51, pointerType: 'mouse', clientX: 200 })
    expect(strip).toHaveClass('cursor-grabbing')

    act(() => {
      store.setState({ weiboCardMultiMediaLayout: 'grid' })
    })
    expect(screen.queryByRole('region', { name: /横向媒体画廊/ })).not.toBeInTheDocument()

    act(() => {
      store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    })
    const nextPhotoView = screen.getAllByTestId('photo-view')[0]!
    expect(screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })).toHaveClass('cursor-grab')
    fireEvent.click(nextPhotoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)
  })

  it('does not suppress a click after a below-threshold release', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    firePointerEvent(strip, 'pointerdown', {
      pointerId: 41,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    firePointerEvent(strip, 'pointermove', {
      pointerId: 41,
      pointerType: 'mouse',
      clientX: 297,
    })
    firePointerEvent(window, 'pointerup', { pointerId: 41 })
    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps the legacy grid image structure free of horizontal press feedback', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel images={createImages(2)} />)

    expect(screen.queryByTestId('media-strip-pressable')).not.toBeInTheDocument()
  })

  it('activates mixed video inline without registering it as a lightbox item', () => {
    const onOpen = vi.fn()
    const onVideoActivate = vi.fn()
    render(
      <ImageCarousel
        images={[]}
        mixMediaItems={[
          {
            type: 'video',
            id: 'video-1',
            videoTitle: '示例视频',
            videoCoverUrl: 'https://example.com/video.jpg',
            videoStreamUrl: 'https://example.com/video.mp4',
          },
        ]}
        onOpen={onOpen}
        onVideoActivate={onVideoActivate}
      />,
    )

    expect(screen.queryByTestId('photo-view')).not.toBeInTheDocument()
    expect(screen.queryByTestId('photo-render')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '播放视频：示例视频' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onVideoActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'video-1' }), 0)
  })

  it('keeps a preview-only mixed video visible but non-interactive', () => {
    const onVideoActivate = vi.fn()
    render(
      <ImageCarousel
        images={[]}
        mixMediaItems={[
          {
            type: 'video',
            id: 'video-1',
            videoCoverUrl: 'https://example.com/video.jpg',
          },
        ]}
        onVideoActivate={onVideoActivate}
      />,
    )

    const trigger = screen.getByRole('button', { name: '视频暂不可播放' })
    expect(trigger).toBeDisabled()
    fireEvent.click(trigger)
    expect(onVideoActivate).not.toHaveBeenCalled()
  })

  it('keeps Embla drag enabled but disables drag-free motion when reduced motion is requested', () => {
    reducedMotionState.current = true
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    expect(useEmblaCarouselMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ watchDrag: false }),
      expect.any(Array),
    )
    expect(useEmblaCarouselMock).toHaveBeenCalledWith(
      expect.objectContaining({ dragFree: false }),
      expect.any(Array),
    )
  })

  it('maps Shift plus vertical wheel input to horizontal Embla navigation', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    fireEvent.wheel(strip, { deltaY: 120, shiftKey: true })
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(1)

    fireEvent.wheel(strip, { deltaX: 120, deltaY: 120, shiftKey: true })
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(2)

    fireEvent.wheel(strip, { deltaY: -120, shiftKey: true })
    expect(emblaApi.scrollPrev).toHaveBeenCalledTimes(1)

    expect(fireEvent.wheel(strip, { deltaY: 120 })).toBe(true)
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(2)

    expect(fireEvent.wheel(strip, { deltaX: 120, deltaY: 20, shiftKey: true })).toBe(true)
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(2)
  })

  it('ignores non-primary mouse buttons when dragging the strip', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
    })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!

    firePointerEvent(photoView, 'pointerdown', {
      pointerId: 9,
      pointerType: 'mouse',
      button: 1,
      clientX: 300,
    })
    firePointerEvent(photoView, 'pointermove', {
      pointerId: 9,
      pointerType: 'mouse',
      clientX: 220,
    })

    expect(strip).toHaveClass('cursor-grab')
  })
})
