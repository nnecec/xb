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

const { photoViewClickSpy } = vi.hoisted(() => ({
  photoViewClickSpy: vi.fn(),
}))

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

  it('renders a keyboard-accessible horizontal strip with clamped media ratios', () => {
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

    const items = strip.querySelectorAll<HTMLElement>('[data-media-strip-item]')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveStyle({ aspectRatio: '0.75' })
    expect(items[1]).toHaveStyle({ aspectRatio: String(16 / 9) })

    Object.defineProperty(items[0], 'offsetLeft', { configurable: true, value: 0 })
    Object.defineProperty(items[1], 'offsetLeft', { configurable: true, value: 400 })

    fireEvent.wheel(strip, { deltaY: 120 })
    expect(strip.scrollLeft).toBe(0)

    fireEvent.keyDown(strip, { key: 'Home' })
    expect(strip.scrollLeft).toBe(0)
    fireEvent.keyDown(strip, { key: 'End' })
    expect(strip.scrollLeft).toBe(400)
  })

  it('supports free-position left-button drag scrolling without opening the lightbox', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
    })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.defineProperties(strip, {
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: releasePointerCapture },
    })
    strip.scrollLeft = 120

    fireEvent.pointerDown(photoView, {
      pointerId: 7,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(strip).toHaveClass('cursor-grab')
    expect(strip).not.toHaveClass('snap-x', 'snap-proximity')
    expect(strip.style.scrollSnapType).toBe('')

    fireEvent.pointerMove(photoView, {
      pointerId: 7,
      pointerType: 'mouse',
      clientX: 220,
    })
    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(strip).toHaveClass('cursor-grabbing')
    expect(strip.style.scrollSnapType).toBe('')
    expect(strip.scrollLeft).toBe(200)

    fireEvent.pointerUp(photoView, {
      pointerId: 7,
      pointerType: 'mouse',
      button: 0,
      clientX: 220,
    })
    expect(releasePointerCapture).toHaveBeenCalledWith(7)
    expect(strip).toHaveClass('cursor-grab')
    expect(strip.style.scrollSnapType).toBe('')
    expect(strip.scrollLeft).toBe(200)

    fireEvent.click(photoView)
    expect(photoViewClickSpy).not.toHaveBeenCalled()

    setPointerCapture.mockClear()
    fireEvent.pointerDown(photoView, {
      pointerId: 8,
      pointerType: 'mouse',
      button: 0,
      clientX: 220,
    })
    fireEvent.pointerUp(photoView, {
      pointerId: 8,
      pointerType: 'mouse',
      button: 0,
      clientX: 220,
    })
    expect(setPointerCapture).not.toHaveBeenCalled()
    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)
  })

  it('shows focus treatment only for keyboard focus', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    expect(strip).toHaveClass('outline-none', 'focus-visible:ring-2')
  })

  it.each([
    [
      'pointercancel',
      21,
      (strip: HTMLElement, pointerId: number) => fireEvent.pointerCancel(strip, { pointerId }),
    ],
    [
      'lostpointercapture',
      22,
      (strip: HTMLElement, pointerId: number) => fireEvent.lostPointerCapture(strip, { pointerId }),
    ],
  ])('clears dragging state on %s', (_name, pointerId, finish) => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    Object.defineProperties(strip, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    })
    fireEvent.pointerDown(photoView, { pointerId, pointerType: 'mouse', button: 0, clientX: 300 })
    fireEvent.pointerMove(photoView, { pointerId, pointerType: 'mouse', clientX: 200 })
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
    Object.defineProperties(strip, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    })
    fireEvent.pointerDown(photoView, {
      pointerId: 31,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    fireEvent.pointerMove(photoView, { pointerId: 31, pointerType: 'mouse', clientX: 200 })
    fireEvent.pointerUp(window, { pointerId: 31 })
    expect(strip).toHaveClass('cursor-grab')
    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(photoView, {
      pointerId: 32,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    fireEvent.pointerMove(photoView, { pointerId: 32, pointerType: 'mouse', clientX: 200 })
    fireEvent.blur(window)
    expect(strip).toHaveClass('cursor-grab')
  })

  it('resets drag and click suppression when horizontal layout is disabled', () => {
    const store = getAppSettingsStore()
    store.setState({ weiboCardMultiMediaLayout: 'horizontal' })
    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    Object.defineProperties(strip, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    })
    fireEvent.pointerDown(photoView, {
      pointerId: 51,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    fireEvent.pointerMove(photoView, { pointerId: 51, pointerType: 'mouse', clientX: 200 })
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

    const photoView = screen.getAllByTestId('photo-view')[0]!
    fireEvent.pointerDown(photoView, {
      pointerId: 41,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
    })
    fireEvent.pointerMove(photoView, { pointerId: 41, pointerType: 'mouse', clientX: 297 })
    fireEvent.pointerUp(photoView, { pointerId: 41, pointerType: 'mouse', button: 0, clientX: 297 })
    fireEvent.click(photoView)
    expect(photoViewClickSpy).toHaveBeenCalledTimes(1)
  })

  it('ignores non-primary mouse buttons when dragging the strip', () => {
    const store = getAppSettingsStore()
    store.setState({
      weiboCardMultiMediaLayout: 'horizontal',
    })

    render(<ImageCarousel variant="card" images={createImages(2)} />)

    const strip = screen.getByRole('region', { name: '横向媒体画廊，共 2 项' })
    const photoView = screen.getAllByTestId('photo-view')[0]!
    const setPointerCapture = vi.fn()
    Object.defineProperty(strip, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    })
    strip.scrollLeft = 120

    fireEvent.pointerDown(photoView, {
      pointerId: 9,
      pointerType: 'mouse',
      button: 1,
      clientX: 300,
    })
    fireEvent.pointerMove(photoView, {
      pointerId: 9,
      pointerType: 'mouse',
      clientX: 220,
    })

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(strip.scrollLeft).toBe(120)
    expect(strip).toHaveClass('cursor-grab')
  })
})
