import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

interface UseMediaStripInteractionOptions {
  enabled: boolean
  itemIds: string[]
  initialItemId?: string
  onVisibleItemChange?: (itemId: string) => void
}

function resolveInitialIndex(itemIds: string[], initialItemId?: string) {
  if (!initialItemId) return 0
  const index = itemIds.indexOf(initialItemId)
  return index < 0 ? 0 : index
}

/**
 * 横向媒体条与 Embla 的接线。
 *
 * 拖动、松手惯性、拖后点击抑制全部交给 Embla 自己：
 * - 拖动：Embla 在视口节点上监听 `mousedown`/`touchstart`，在 `document` 上跟踪
 *   `mousemove`/`mouseup`；
 * - 惯性：`dragFree`；
 * - 拖后点击抑制：`mousemove` 超过 `dragThreshold` 后，Embla 在视口节点的 click
 *   捕获阶段 `stopPropagation` + `preventDefault`。
 *
 * 这里不再维护指针状态机、不再合成 `mouseup`、也不再自己拦截 click。
 *
 * 唯一的硬约束：Embla 的 options 必须保持稳定。`embla-carousel-react` 会对 options
 * 做值比较并在变化时调用 `reInit()`，而 `reInit()` 会销毁进行中的拖动
 * （`dragHandler.destroy()`，连拖后点击抑制标志一起丢弃）并把位置硬重置到对齐后的
 * snap（`translate.clear()` 后按 `startIndex` 重建）。那正是"松手瞬间吸附到左边缘、
 * 惯性消失、并且这一次点击落到大图上"的成因，所以 `startIndex` 只在挂载时读取一次。
 */
export function useMediaStripInteraction({
  enabled,
  itemIds,
  initialItemId,
  onVisibleItemChange,
}: UseMediaStripInteractionOptions) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const itemIdsRef = useRef(itemIds)
  const initialIndex = resolveInitialIndex(itemIds, initialItemId)
  // Embla 只在创建引擎时读取 startIndex，挂载后传入新值只会触发 reInit（见文件头注释）。
  const [startIndex] = useState(initialIndex)
  const currentItemIdRef = useRef(itemIds[initialIndex])
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const itemIdentity = itemIds.join('\u0000')
  const previousItemIdentityRef = useRef(itemIdentity)
  const plugins = useMemo(() => [WheelGesturesPlugin({ wheelDraggingClass: '' })], [])
  const options = useMemo(
    () => ({
      axis: 'x' as const,
      align: 'start' as const,
      // 惯性是这条横向条的交互模型本身（松手后自由滑行），不随 reduced motion 开关变化。
      dragFree: true,
      containScroll: 'trimSnaps' as const,
      loop: false,
      startIndex,
    }),
    [startIndex],
  )
  const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)

  useEffect(() => {
    itemIdsRef.current = itemIds
  }, [itemIds])

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      emblaRef(node)
    },
    [emblaRef],
  )

  useEffect(() => {
    if (!emblaApi || !enabled) return

    const syncSelectedItem = () => {
      const lastIndex = Math.max(itemIdsRef.current.length - 1, 0)
      const index = Math.min(Math.max(emblaApi.selectedScrollSnap(), 0), lastIndex)
      const itemId = itemIdsRef.current[index]
      setActiveIndex(index)
      currentItemIdRef.current = itemId
      if (itemId) onVisibleItemChange?.(itemId)
    }

    emblaApi.on('select', syncSelectedItem)
    emblaApi.on('reInit', syncSelectedItem)
    syncSelectedItem()

    return () => {
      emblaApi.off('select', syncSelectedItem)
      emblaApi.off('reInit', syncSelectedItem)
    }
  }, [emblaApi, enabled, onVisibleItemChange])

  useEffect(() => {
    if (previousItemIdentityRef.current === itemIdentity) return
    previousItemIdentityRef.current = itemIdentity
    const currentItemIds = itemIdsRef.current
    if (!emblaApi || !enabled || currentItemIds.length === 0) return
    const currentIndex = currentItemIdRef.current
      ? currentItemIds.indexOf(currentItemIdRef.current)
      : -1
    const nextIndex =
      currentIndex >= 0 ? currentIndex : resolveInitialIndex(currentItemIds, initialItemId)
    emblaApi.scrollTo(nextIndex, true)
  }, [emblaApi, enabled, initialItemId, itemIdentity])

  useEffect(() => {
    const root = rootRef.current
    if (!emblaApi || !enabled || !root) return

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
  }, [emblaApi, enabled])

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!emblaApi) return
      const lastIndex = Math.max(itemIds.length - 1, 0)
      const currentIndex = emblaApi.selectedScrollSnap()
      let nextIndex: number | null = null
      if (event.key === 'ArrowLeft') nextIndex = currentIndex - 1
      if (event.key === 'ArrowRight') nextIndex = currentIndex + 1
      if (event.key === 'Home') nextIndex = 0
      if (event.key === 'End') nextIndex = lastIndex
      if (nextIndex === null) return

      event.preventDefault()
      emblaApi.scrollTo(Math.min(Math.max(nextIndex, 0), lastIndex))
    },
    [emblaApi, itemIds.length],
  )

  return {
    activeIndex,
    setRootRef,
    handleKeyDown,
  }
}
