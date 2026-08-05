import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

interface UseMediaStripInteractionOptions {
  enabled: boolean
  itemIds: string[]
  initialItemId?: string
  dragFree: boolean
  onVisibleItemChange?: (itemId: string) => void
}

function resolveInitialIndex(itemIds: string[], initialItemId?: string) {
  if (!initialItemId) return 0
  const index = itemIds.indexOf(initialItemId)
  return index < 0 ? 0 : index
}

export function useMediaStripInteraction({
  enabled,
  itemIds,
  initialItemId,
  dragFree,
  onVisibleItemChange,
}: UseMediaStripInteractionOptions) {
  const initialIndex = resolveInitialIndex(itemIds, initialItemId)
  const itemIdsRef = useRef(itemIds)
  const currentItemIdRef = useRef(itemIds[initialIndex])
  const rootRef = useRef<HTMLDivElement>(null)
  const pointerStartXRef = useRef<number | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const activePointerTypeRef = useRef<string | null>(null)
  const suppressNextClickRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const itemIdentity = itemIds.join('\u0000')
  const previousItemIdentityRef = useRef(itemIdentity)
  const [isDragging, setIsDragging] = useState(false)
  const plugins = useMemo(() => [WheelGesturesPlugin({ wheelDraggingClass: '' })], [])
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      axis: 'x',
      align: 'start',
      dragFree,
      containScroll: 'trimSnaps',
      loop: false,
      startIndex: initialIndex,
    },
    plugins,
  )

  itemIdsRef.current = itemIds

  const clearDrag = useCallback((clearClickGuard = true) => {
    setIsDragging(false)
    pointerStartXRef.current = null
    activePointerIdRef.current = null
    activePointerTypeRef.current = null
    if (clearClickGuard) suppressNextClickRef.current = false
  }, [])

  const releaseEmblaDrag = useCallback(() => {
    const root = rootRef.current
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

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      emblaRef(node)
    },
    [emblaRef],
  )

  useEffect(() => {
    if (!emblaApi || !enabled) {
      clearDrag()
      return
    }

    const updateVisibleItem = () => {
      const maxIndex = Math.max(itemIdsRef.current.length - 1, 0)
      const index = Math.min(Math.max(emblaApi.selectedScrollSnap(), 0), maxIndex)
      const itemId = itemIdsRef.current[index]
      setActiveIndex(index)
      currentItemIdRef.current = itemId
      if (itemId) onVisibleItemChange?.(itemId)
    }
    const handleWindowRelease = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return
      if (event.type === 'pointercancel') releaseEmblaDrag()
      const target = event.target
      const releasedInside = target instanceof Node && rootRef.current?.contains(target)
      clearDrag(!releasedInside)
    }
    const handleEmblaPointerUp = () => clearDrag(false)
    const handleWindowBlur = () => {
      releaseEmblaDrag()
      clearDrag()
    }

    emblaApi.on('select', updateVisibleItem)
    emblaApi.on('reInit', updateVisibleItem)
    emblaApi.on('pointerUp', handleEmblaPointerUp)
    window.addEventListener('pointerup', handleWindowRelease)
    window.addEventListener('pointercancel', handleWindowRelease)
    window.addEventListener('blur', handleWindowBlur)
    updateVisibleItem()

    return () => {
      emblaApi.off('select', updateVisibleItem)
      emblaApi.off('reInit', updateVisibleItem)
      emblaApi.off('pointerUp', handleEmblaPointerUp)
      window.removeEventListener('pointerup', handleWindowRelease)
      window.removeEventListener('pointercancel', handleWindowRelease)
      window.removeEventListener('blur', handleWindowBlur)
      clearDrag()
    }
  }, [clearDrag, emblaApi, enabled, onVisibleItemChange, releaseEmblaDrag])

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
      let nextIndex: number | null = null
      if (event.key === 'ArrowLeft') nextIndex = activeIndex - 1
      if (event.key === 'ArrowRight') nextIndex = activeIndex + 1
      if (event.key === 'Home') nextIndex = 0
      if (event.key === 'End') nextIndex = itemIds.length - 1
      if (nextIndex === null) return

      event.preventDefault()
      const clampedIndex = Math.min(Math.max(nextIndex, 0), itemIds.length - 1)
      const itemId = itemIds[clampedIndex]
      setActiveIndex(clampedIndex)
      currentItemIdRef.current = itemId
      if (itemId) onVisibleItemChange?.(itemId)
      emblaApi?.scrollTo(clampedIndex)
    },
    [activeIndex, emblaApi, itemIds, onVisibleItemChange],
  )

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStartXRef.current = event.clientX
    activePointerIdRef.current = event.pointerId
    activePointerTypeRef.current = event.pointerType
    suppressNextClickRef.current = false
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerId === activePointerIdRef.current &&
      pointerStartXRef.current !== null &&
      Math.abs(event.clientX - pointerStartXRef.current) > 5
    ) {
      suppressNextClickRef.current = true
      setIsDragging(true)
    }
  }, [])

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressNextClickRef.current) return
    suppressNextClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerId !== activePointerIdRef.current) return
      releaseEmblaDrag()
      clearDrag()
    },
    [clearDrag, releaseEmblaDrag],
  )

  return {
    activeIndex,
    isDragging,
    setRootRef,
    handleClickCapture,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  }
}
