import { useReducedMotion } from 'motion/react'
import { memo, useMemo } from 'react'
import { PhotoProvider } from 'react-photo-view'

import 'react-photo-view/dist/react-photo-view.css'
import { getUiPortalContainer } from '@/components/ui/portal'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'

import { PhotoToolbar } from '../photo-toolbar'
import { MediaCollectionItemView } from './media-collection-item'
import type { MediaCollectionItem } from './media-collection-model'
import { useMediaStripInteraction } from './use-media-strip-interaction'

export interface MediaCollectionProps {
  items: MediaCollectionItem[]
  onOpen?: () => void
  singleMediaMaxWidth?: number
  presentation?: 'inline' | 'card'
  initialItemId?: string
  onVisibleItemChange?: (itemId: string) => void
  onItemActivate?: (item: MediaCollectionItem) => void
}

function legacyGridClassName(count: number) {
  if (count === 1) return 'max-w-[450px] grid-cols-1'
  if (count === 2) return 'grid-cols-2 max-w-[650px]'
  if (count === 3) return 'grid-cols-2 max-w-[650px] sm:grid-cols-3'
  if (count === 4) return 'grid-cols-2 max-w-[650px]'
  if (count > 9) return 'grid-cols-3 max-w-[650px] sm:grid-cols-4'
  return 'grid-cols-3 max-w-[650px]'
}

function intrinsicMediaRatio(item: MediaCollectionItem) {
  if (item.kind === 'video') {
    return item.video.videoOrientation === 'vertical' ? 4 / 5 : 16 / 9
  }

  if (item.image.width && item.image.height) {
    const rawRatio = item.image.width / item.image.height
    return Math.min(Math.max(rawRatio, 3 / 4), 16 / 9)
  }

  return 1
}

function mediaRatio(item: MediaCollectionItem, total: number, horizontal: boolean) {
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

export const MediaCollection = memo(function MediaCollection({
  items,
  onOpen,
  singleMediaMaxWidth,
  presentation = 'inline',
  initialItemId,
  onVisibleItemChange,
  onItemActivate,
}: MediaCollectionProps) {
  const container = useMemo(() => getUiPortalContainer(), [])
  const darkModeImageDim = useAppSettings((s) => s.darkModeImageDim)
  const photoLoopEnabled = useAppSettings((s) => s.photoLoopEnabled)
  const defaultSingleImageMaxWidth = useAppSettings((s) => s.weiboCardSingleImageMaxWidth)
  const cardLayout = useAppSettings((s) => s.weiboCardMultiMediaLayout)
  const cardGridLimit = useAppSettings((s) => s.weiboCardMultiMediaGridLimit)
  const cardGridMaxWidth = useAppSettings((s) => s.weiboCardMultiMediaGridMaxWidth)
  const cardStripHeight = useAppSettings((s) => s.weiboCardMultiMediaStripHeight)
  const reducedMotion = useReducedMotion()
  const motionEnabled = reducedMotion === false
  const usesCardLayout = presentation === 'card' && items.length > 1
  const horizontal = usesCardLayout && cardLayout === 'horizontal'
  const itemIds = useMemo(() => items.map((item) => item.id), [items])
  const strip = useMediaStripInteraction({
    enabled: horizontal,
    itemIds,
    initialItemId,
    dragFree: motionEnabled,
    onVisibleItemChange,
  })
  const visibleCount =
    usesCardLayout && cardLayout === 'grid' ? Math.min(items.length, cardGridLimit) : items.length
  const remainingCount = items.length - visibleCount

  if (items.length === 0) return null

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
          aria-label={horizontal ? `横向媒体画廊，共 ${items.length} 项` : undefined}
          tabIndex={horizontal ? 0 : undefined}
          className={cn(
            horizontal
              ? 'scrollbar-none max-h-[60vh] overflow-hidden overscroll-x-contain md:max-h-none'
              : 'grid w-full gap-2',
            horizontal && (strip.isDragging ? 'cursor-grabbing' : 'cursor-grab'),
            horizontal &&
              'select-none outline-none focus:outline-none focus:ring-0 [touch-action:pan-y]',
            !horizontal &&
              (usesCardLayout
                ? cardGridClassName(visibleCount)
                : legacyGridClassName(items.length)),
          )}
          style={
            horizontal
              ? { height: `${cardStripHeight}px` }
              : usesCardLayout
                ? { maxWidth: `${cardGridMaxWidth}px` }
                : items.length === 1
                  ? { maxWidth: `${singleMediaMaxWidth ?? defaultSingleImageMaxWidth}px` }
                  : undefined
          }
          ref={horizontal ? strip.setRootRef : undefined}
          onClickCapture={horizontal ? strip.handleClickCapture : undefined}
          onDragStart={horizontal ? (event) => event.preventDefault() : undefined}
          onKeyDown={horizontal ? strip.handleKeyDown : undefined}
          onPointerDown={horizontal ? strip.handlePointerDown : undefined}
          onPointerMove={horizontal ? strip.handlePointerMove : undefined}
          onPointerCancel={horizontal ? strip.handlePointerEnd : undefined}
          onLostPointerCapture={horizontal ? strip.handlePointerEnd : undefined}
        >
          <div className={cn(horizontal ? 'flex h-full gap-2' : 'contents')}>
            {items.map((item, index) => {
              const ratio = mediaRatio(item, items.length, horizontal)
              const hiddenByGridLimit = !horizontal && index >= visibleCount

              return (
                <div
                  key={`${item.kind}:${item.id}`}
                  data-media-strip-item={horizontal ? '' : undefined}
                  role={horizontal ? 'group' : undefined}
                  aria-label={horizontal ? `第 ${index + 1} 项，共 ${items.length} 项` : undefined}
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
                  <MediaCollectionItemView
                    item={item}
                    ratio={ratio}
                    roundedClassName={items.length === 1 ? 'rounded-xl' : 'rounded-lg'}
                    horizontal={horizontal}
                    dimImages={darkModeImageDim}
                    motionEnabled={motionEnabled}
                    remainingCount={index === visibleCount - 1 ? remainingCount : 0}
                    onActivate={(activatedItem) => {
                      onOpen?.()
                      onItemActivate?.(activatedItem)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
        {horizontal ? (
          <span className="sr-only" aria-live="polite">
            当前第 {strip.activeIndex + 1} 项，共 {items.length} 项
          </span>
        ) : null}
      </PhotoProvider>
    </div>
  )
})
