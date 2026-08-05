import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { PlayIcon, SquarePlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import React, { memo } from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import type { PhotoRenderParams } from 'react-photo-view/dist/types'

import 'react-photo-view/dist/react-photo-view.css'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUiPortalContainer } from '@/components/ui/portal'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import type { FeedImage, FeedMixMediaItem } from '@/lib/weibo/models/feed'

import { buildMediaGalleryItems, type MediaGalleryItem } from './media-region/media-region-model'
import { PhotoToolbar } from './photo-toolbar'

interface ImageCarouselProps {
  images: FeedImage[]
  mixMediaItems?: FeedMixMediaItem[]
  downloadFilename?: string
  onOpen?: () => void
  singleMediaMaxWidth?: number
  variant?: 'inline' | 'card'
  items?: MediaGalleryItem[]
  initialStripIndex?: number
  onStripIndexChange?: (index: number) => void
  onVideoActivate?: (video: FeedMixMediaItem, index: number) => void
}

const LONG_IMAGE_RATIO = 2.6

function isLongImage(image: FeedImage) {
  return Boolean(image.width && image.height && image.height / image.width >= LONG_IMAGE_RATIO)
}

function legacyGridClassName(count: number) {
  if (count === 1) return 'max-w-[450px] grid-cols-1'
  if (count === 2) return 'grid-cols-2 max-w-[650px]'
  if (count === 3) return 'grid-cols-2 max-w-[650px] sm:grid-cols-3'
  if (count === 4) return 'grid-cols-2 max-w-[650px]'
  if (count > 9) return 'grid-cols-3 max-w-[650px] sm:grid-cols-4'
  return 'grid-cols-3 max-w-[650px]'
}

function intrinsicMediaRatio(item: MediaGalleryItem) {
  if (item.kind === 'video') {
    return item.video.videoOrientation === 'vertical' ? 4 / 5 : 16 / 9
  }

  if (item.image.width && item.image.height) {
    const rawRatio = item.image.width / item.image.height
    return Math.min(Math.max(rawRatio, 3 / 4), 16 / 9)
  }

  return 1
}

function mediaRatio(item: MediaGalleryItem, total: number, horizontal: boolean) {
  if (horizontal || total === 1) return intrinsicMediaRatio(item)
  return 1
}

function cardGridClassName(count: number) {
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-2 sm:grid-cols-3'
  if (count === 4) return 'grid-cols-2'
  if (count <= 9) return 'grid-cols-2 sm:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
}

/** Inset media outline: pure black/white only (never tinted neutrals). */
const mediaOutlineClassName =
  'outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10'

function ImageOverlay({
  image,
  dim,
  square = true,
}: {
  image: FeedImage
  dim: boolean
  square?: boolean
}) {
  return (
    <>
      {dim ? <div className="dark:bg-background/25 absolute inset-0 z-10" /> : null}
      <img
        src={image.thumbnailUrl}
        className={cn(square && 'aspect-square', 'h-full w-full object-cover object-center')}
        alt=""
        width={image.width ?? 1}
        height={image.height ?? 1}
        loading="lazy"
        decoding="async"
      />
      {image.type === 'livephoto' ? (
        <Badge
          className="absolute bottom-1 left-1 z-20 font-mono text-xs backdrop-blur select-none"
          variant="outline"
        >
          Live
        </Badge>
      ) : null}
      {isLongImage(image) ? (
        <Badge
          className="absolute bottom-1 left-1 z-20 font-mono text-xs backdrop-blur select-none"
          variant="outline"
        >
          长图
        </Badge>
      ) : null}
    </>
  )
}

function RemainingMediaOverlay({ count }: { count: number }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 text-2xl font-semibold text-white backdrop-grayscale"
      aria-label={`还有 ${count} 项媒体`}
    >
      +{count}
    </div>
  )
}

function LivePhotoPreview({ image, params }: { image: FeedImage; params: PhotoRenderParams }) {
  const [isPlaying, setIsPlaying] = React.useState(true)

  // react-photo-view 在 render 内容首次出现时不会重新测量容器。这里在挂载后触发一次
  // resize,让 lightbox 按内容真实尺寸重排,避免 Live Photo 视频被裁切。
  React.useEffect(() => {
    const handle = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  return (
    <div
      {...params.attrs}
      className={cn('relative', params.attrs.className)}
      style={params.attrs.style}
    >
      {isPlaying ? (
        <video
          key={image.livePhotoVideoUrl}
          src={image.livePhotoVideoUrl}
          poster={image.largeUrl}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={() => setIsPlaying(false)}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        />
      ) : (
        <img
          src={image.largeUrl}
          className="h-full w-full object-contain"
          alt=""
          width={image.width ?? 1}
          height={image.height ?? 1}
          style={{ transform: `scale(${params.scale})` }}
        />
      )}
      <Button
        type="button"
        aria-label={isPlaying ? '正在播放 Live Photo' : '重新播放 Live Photo'}
        variant="outline"
        className="absolute bottom-4 left-4 z-30 border font-mono font-medium backdrop-blur"
        size="sm"
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!isPlaying) setIsPlaying(true)
        }}
      >
        <SquarePlay className="size-3" />
        Live
      </Button>
    </div>
  )
}

function ImagePhotoView({ image, children }: { image: FeedImage; children: React.ReactElement }) {
  if (image.type === 'livephoto' && image.livePhotoVideoUrl) {
    return (
      <PhotoView
        width={image.width}
        height={image.height}
        render={(params) => <LivePhotoPreview image={image} params={params} />}
      >
        {children}
      </PhotoView>
    )
  }

  return <PhotoView src={image.largeUrl}>{children}</PhotoView>
}

export const ImageCarousel = memo(function ImageCarousel({
  images,
  mixMediaItems,
  onOpen,
  singleMediaMaxWidth,
  variant = 'inline',
  items,
  initialStripIndex = 0,
  onStripIndexChange,
  onVideoActivate,
}: ImageCarouselProps) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  const darkModeImageDim = useAppSettings((s) => s.darkModeImageDim)
  const photoLoopEnabled = useAppSettings((s) => s.photoLoopEnabled)
  const cardLayout = useAppSettings((s) => s.weiboCardMultiMediaLayout)
  const cardGridLimit = useAppSettings((s) => s.weiboCardMultiMediaGridLimit)
  const cardGridMaxWidth = useAppSettings((s) => s.weiboCardMultiMediaGridMaxWidth)
  const cardStripHeight = useAppSettings((s) => s.weiboCardMultiMediaStripHeight)
  const [activeStripIndex, setActiveStripIndex] = React.useState(initialStripIndex)
  const [isStripDragging, setIsStripDragging] = React.useState(false)
  const suppressNextStripClickRef = React.useRef(false)
  const pointerStartXRef = React.useRef<number | null>(null)
  const activePointerIdRef = React.useRef<number | null>(null)
  const activePointerTypeRef = React.useRef<string | null>(null)
  const emblaRootRef = React.useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const motionEnabled = reducedMotion === false

  const clearStripDrag = React.useCallback((clearClickGuard = true) => {
    setIsStripDragging(false)
    pointerStartXRef.current = null
    activePointerIdRef.current = null
    activePointerTypeRef.current = null
    if (clearClickGuard) suppressNextStripClickRef.current = false
  }, [])

  const releaseEmblaDrag = React.useCallback(() => {
    const root = emblaRootRef.current
    if (!root || activePointerIdRef.current === null || activePointerTypeRef.current !== 'mouse') {
      return
    }

    root.ownerDocument.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
      }),
    )
  }, [])

  const gridItems = React.useMemo(
    () => items ?? buildMediaGalleryItems(images, mixMediaItems),
    [images, items, mixMediaItems],
  )

  const usesCardLayout = variant === 'card' && gridItems.length > 1
  const horizontal = usesCardLayout && cardLayout === 'horizontal'
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      axis: 'x',
      align: 'start',
      dragFree: motionEnabled,
      containScroll: 'trimSnaps',
      loop: false,
      startIndex: initialStripIndex,
    },
    [WheelGesturesPlugin({ wheelDraggingClass: '' })],
  )
  const setEmblaRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      emblaRootRef.current = node
      emblaRef(node)
    },
    [emblaRef],
  )
  const visibleCount =
    usesCardLayout && cardLayout === 'grid'
      ? Math.min(gridItems.length, cardGridLimit)
      : gridItems.length
  const remainingCount = gridItems.length - visibleCount

  React.useEffect(() => {
    if (!emblaApi || !horizontal) {
      clearStripDrag()
      return
    }
    const updateIndex = () => {
      const index = emblaApi.selectedScrollSnap()
      setActiveStripIndex(index)
      onStripIndexChange?.(index)
    }
    const handleWindowRelease = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return
      if (event.type === 'pointercancel') releaseEmblaDrag()
      const target = event.target
      const releasedInside = target instanceof Node && emblaRootRef.current?.contains(target)
      clearStripDrag(!releasedInside)
    }
    const handleEmblaPointerUp = () => clearStripDrag(false)
    const handleWindowBlur = () => {
      releaseEmblaDrag()
      clearStripDrag()
    }
    emblaApi.on('select', updateIndex)
    emblaApi.on('reInit', updateIndex)
    emblaApi.on('pointerUp', handleEmblaPointerUp)
    window.addEventListener('pointerup', handleWindowRelease)
    window.addEventListener('pointercancel', handleWindowRelease)
    window.addEventListener('blur', handleWindowBlur)
    updateIndex()
    return () => {
      emblaApi.off('select', updateIndex)
      emblaApi.off('reInit', updateIndex)
      emblaApi.off('pointerUp', handleEmblaPointerUp)
      window.removeEventListener('pointerup', handleWindowRelease)
      window.removeEventListener('pointercancel', handleWindowRelease)
      window.removeEventListener('blur', handleWindowBlur)
      clearStripDrag()
    }
  }, [clearStripDrag, emblaApi, horizontal, onStripIndexChange, releaseEmblaDrag])

  React.useEffect(() => {
    if (horizontal && gridItems.length > 0) return
    clearStripDrag()
    setActiveStripIndex(0)
    onStripIndexChange?.(0)
  }, [clearStripDrag, gridItems.length, horizontal, onStripIndexChange])

  React.useEffect(() => {
    const root = emblaRootRef.current
    if (!emblaApi || !horizontal || !root) return

    const handleShiftWheel = (event: WheelEvent) => {
      const verticalDeltaIsDominant = Math.abs(event.deltaY) > Math.abs(event.deltaX)
      if (!event.shiftKey || event.deltaY === 0 || !verticalDeltaIsDominant) return

      event.preventDefault()
      event.stopImmediatePropagation()
      root.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          composed: true,
          deltaMode: event.deltaMode,
          deltaX: event.deltaY,
          deltaY: 0,
          clientX: event.clientX,
          clientY: event.clientY,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        }),
      )
    }

    root.addEventListener('wheel', handleShiftWheel, { capture: true, passive: false })
    return () => root.removeEventListener('wheel', handleShiftWheel, true)
  }, [emblaApi, horizontal])

  if (gridItems.length === 0) {
    return null
  }

  function handleStripKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowLeft') nextIndex = activeStripIndex - 1
    if (event.key === 'ArrowRight') nextIndex = activeStripIndex + 1
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = gridItems.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const clampedIndex = Math.min(Math.max(nextIndex, 0), gridItems.length - 1)
    setActiveStripIndex(clampedIndex)
    onStripIndexChange?.(clampedIndex)
    emblaApi?.scrollTo(clampedIndex)
  }

  function handleStripPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pointerStartXRef.current = event.clientX
    activePointerIdRef.current = event.pointerId
    activePointerTypeRef.current = event.pointerType
    suppressNextStripClickRef.current = false
  }

  function handleStripPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (
      event.pointerId === activePointerIdRef.current &&
      pointerStartXRef.current !== null &&
      Math.abs(event.clientX - pointerStartXRef.current) > 5
    ) {
      suppressNextStripClickRef.current = true
      setIsStripDragging(true)
    }
  }

  function handleStripClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressNextStripClickRef.current) return

    suppressNextStripClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div>
      <PhotoProvider
        portalContainer={container}
        photoClosable={true}
        loop={photoLoopEnabled}
        onVisibleChange={(visible) => {
          if (visible) onOpen?.()
        }}
        toolbarRender={(overlayProps) => <PhotoToolbar overlayProps={overlayProps} />}
      >
        <div
          role={horizontal ? 'region' : undefined}
          aria-label={horizontal ? `横向媒体画廊，共 ${gridItems.length} 项` : undefined}
          tabIndex={horizontal ? 0 : undefined}
          className={cn(
            horizontal
              ? 'scrollbar-none max-h-[60vh] overflow-hidden overscroll-x-contain md:max-h-none'
              : 'grid w-full gap-2',
            horizontal && (isStripDragging ? 'cursor-grabbing' : 'cursor-grab'),
            horizontal &&
              'select-none outline-none focus:outline-none focus:ring-0 [touch-action:pan-y]',
            !horizontal &&
              (usesCardLayout
                ? cardGridClassName(visibleCount)
                : legacyGridClassName(gridItems.length)),
          )}
          style={
            horizontal
              ? {
                  height: `${cardStripHeight}px`,
                }
              : usesCardLayout
                ? { maxWidth: `${cardGridMaxWidth}px` }
                : singleMediaMaxWidth !== undefined && gridItems.length === 1
                  ? { maxWidth: `${singleMediaMaxWidth}px` }
                  : undefined
          }
          ref={horizontal ? setEmblaRootRef : undefined}
          onClickCapture={horizontal ? handleStripClickCapture : undefined}
          onDragStart={horizontal ? (event) => event.preventDefault() : undefined}
          onKeyDown={horizontal ? handleStripKeyDown : undefined}
          onPointerDown={horizontal ? handleStripPointerDown : undefined}
          onPointerMove={horizontal ? handleStripPointerMove : undefined}
          onPointerCancel={
            horizontal
              ? (event) => {
                  if (event.pointerId !== activePointerIdRef.current) return
                  releaseEmblaDrag()
                  clearStripDrag()
                }
              : undefined
          }
          onLostPointerCapture={
            horizontal
              ? (event) => {
                  if (event.pointerId !== activePointerIdRef.current) return
                  releaseEmblaDrag()
                  clearStripDrag()
                }
              : undefined
          }
        >
          <div className={cn(horizontal ? 'flex h-full gap-2' : 'contents')}>
            {gridItems.map((item, index) => {
              const ratio = mediaRatio(item, gridItems.length, horizontal)
              const roundedClassName = gridItems.length === 1 ? 'rounded-xl' : 'rounded-lg'
              const hiddenByGridLimit = !horizontal && index >= visibleCount
              const itemRemainingCount = index === visibleCount - 1 ? remainingCount : 0

              return (
                <div
                  key={`${item.kind}:${item.id}`}
                  data-media-strip-item={horizontal ? '' : undefined}
                  role={horizontal ? 'group' : undefined}
                  aria-label={
                    horizontal ? `第 ${index + 1} 项，共 ${gridItems.length} 项` : undefined
                  }
                  aria-hidden={hiddenByGridLimit || undefined}
                  className={cn(horizontal && 'h-full shrink-0', hiddenByGridLimit && 'hidden')}
                  style={
                    horizontal
                      ? { width: `${cardStripHeight * ratio}px`, aspectRatio: ratio }
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  {item.kind === 'image' ? (
                    <ImagePhotoView image={item.image}>
                      {horizontal ? (
                        <motion.div
                          data-testid="media-strip-pressable"
                          whileTap={motionEnabled ? { scale: 0.98 } : undefined}
                          transition={{ type: 'spring', bounce: 0 }}
                          className={cn(
                            'bg-muted relative h-full w-full overflow-hidden',
                            mediaOutlineClassName,
                            roundedClassName,
                          )}
                        >
                          <AspectRatio
                            ratio={ratio}
                            className="relative h-full w-full overflow-hidden"
                          >
                            <ImageOverlay
                              image={item.image}
                              dim={darkModeImageDim}
                              square={false}
                            />
                            {itemRemainingCount > 0 ? (
                              <RemainingMediaOverlay count={itemRemainingCount} />
                            ) : null}
                          </AspectRatio>
                        </motion.div>
                      ) : (
                        <AspectRatio
                          ratio={ratio}
                          className={cn(
                            'bg-muted relative overflow-hidden',
                            mediaOutlineClassName,
                            roundedClassName,
                          )}
                        >
                          <ImageOverlay image={item.image} dim={darkModeImageDim} square={true} />
                          {itemRemainingCount > 0 ? (
                            <RemainingMediaOverlay count={itemRemainingCount} />
                          ) : null}
                        </AspectRatio>
                      )}
                    </ImagePhotoView>
                  ) : (
                    <button
                      type="button"
                      data-media-video-id={item.id}
                      disabled={item.playable === false}
                      aria-label={
                        item.playable === false
                          ? '视频暂不可播放'
                          : item.video.videoTitle
                            ? `播放视频：${item.video.videoTitle}`
                            : '播放视频'
                      }
                      className={cn(
                        'block h-full w-full text-left',
                        item.playable === false && 'cursor-not-allowed opacity-80',
                      )}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        if (item.playable === false) return
                        onOpen?.()
                        onVideoActivate?.(item.video, index)
                      }}
                    >
                      <AspectRatio
                        ratio={ratio}
                        className={cn(
                          'bg-muted relative overflow-hidden',
                          horizontal && 'h-full w-full',
                          mediaOutlineClassName,
                          roundedClassName,
                        )}
                      >
                        {item.video.videoCoverUrl ? (
                          <img
                            src={item.video.videoCoverUrl}
                            className="h-full w-full object-cover object-center"
                            alt=""
                            width={item.video.videoOrientation === 'vertical' ? 600 : 960}
                            height={item.video.videoOrientation === 'vertical' ? 800 : 540}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                            <PlayIcon className="ml-0.5 size-6 fill-current" />
                          </span>
                        </div>
                        {itemRemainingCount > 0 ? (
                          <RemainingMediaOverlay count={itemRemainingCount} />
                        ) : null}
                      </AspectRatio>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {horizontal ? (
          <span className="sr-only" aria-live="polite">
            当前第 {activeStripIndex + 1} 项，共 {gridItems.length} 项
          </span>
        ) : null}
      </PhotoProvider>
    </div>
  )
})
