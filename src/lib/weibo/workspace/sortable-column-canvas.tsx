import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core'
import { arrayMove, horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  COLUMN_WIDTH_PX,
  CUSTOM_COLUMN_WIDTH_MAX,
  CUSTOM_COLUMN_WIDTH_MIN,
} from '@/lib/app-settings'
import { AuxiliaryColumnView } from '@/lib/weibo/workspace/auxiliary-column'
import { type AuxiliaryColumn } from '@/lib/weibo/workspace/workspace-store'

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 })

export function copyColumnDragPreviewState(source: Element, clone: Element) {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    clone.scrollTop = source.scrollTop
    clone.scrollLeft = source.scrollLeft
  }
  if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    clone.value = source.value
    clone.checked = source.checked
  } else if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
    clone.value = source.value
  } else if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
    clone.selectedIndex = source.selectedIndex
  }

  const count = Math.min(source.children.length, clone.children.length)
  for (let index = 0; index < count; index += 1) {
    const sourceChild = source.children[index]
    const cloneChild = clone.children[index]
    if (sourceChild && cloneChild) copyColumnDragPreviewState(sourceChild, cloneChild)
  }
}

function prepareColumnDragClone(clone: HTMLElement) {
  clone.style.opacity = '1'
  clone.style.transform = 'none'
  clone.style.transition = 'none'
  clone.style.width = '100%'
  clone.style.height = '100%'
  clone.setAttribute('aria-hidden', 'true')
  clone.setAttribute('inert', '')
  clone.removeAttribute('id')
  for (const node of clone.querySelectorAll('[id]')) node.removeAttribute('id')
  for (const video of clone.querySelectorAll('video')) {
    video.pause()
    video.removeAttribute('autoplay')
  }
}

export function ColumnDragPreview({ source }: { source: HTMLElement }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const previewSource = source.matches('[data-auxiliary-column]')
      ? source
      : (source.querySelector<HTMLElement>('[data-auxiliary-column]') ?? source)
    const clone = previewSource.cloneNode(true)
    if (!(clone instanceof HTMLElement)) return
    prepareColumnDragClone(clone)
    host.replaceChildren(clone)
    void clone.offsetHeight
    copyColumnDragPreviewState(previewSource, clone)
    return () => {
      host.replaceChildren()
    }
  }, [source])

  return (
    <div
      ref={hostRef}
      data-column-drag-preview
      className="pointer-events-none h-full w-full overflow-hidden shadow-lg"
    />
  )
}

/** Space between columns. One click scrolls by one column plus this gap. */
const COLUMN_CANVAS_GAP_PX = 12

function readColumnScrollEdges(canvas: HTMLElement) {
  const maxScrollLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth)
  return {
    canScrollLeft: canvas.scrollLeft > 1,
    canScrollRight: maxScrollLeft - canvas.scrollLeft > 1,
  }
}

function ColumnScrollButtons({
  canvasRef,
  columnWidthPx,
  columnCount,
  shouldReduceMotion,
}: {
  canvasRef: RefObject<HTMLDivElement | null>
  columnWidthPx: number
  columnCount: number
  shouldReduceMotion: boolean
}) {
  const [edges, setEdges] = useState({ canScrollLeft: false, canScrollRight: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const update = () => setEdges(readColumnScrollEdges(canvas))
    update()
    canvas.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(canvas)
    const track = canvas.firstElementChild
    if (track instanceof Element) observer.observe(track)
    return () => {
      canvas.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [canvasRef, columnCount, columnWidthPx])

  const scrollByColumn = (direction: -1 | 1) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const track = canvas.firstElementChild
    const canvasRect = canvas.getBoundingClientRect()
    const visibleLeft = canvasRect.left
    const items = track ? Array.from(track.children) : []
    const measurableItems = items.filter((item) => {
      const rect = item.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const currentIndex = measurableItems.findIndex(
      (item) => item.getBoundingClientRect().right > visibleLeft + 1,
    )
    const targetIndex = currentIndex < 0 ? -1 : currentIndex + direction
    const target = measurableItems[targetIndex]

    if (target) {
      const targetRect = target.getBoundingClientRect()
      canvas.scrollTo({
        left: Math.max(0, canvas.scrollLeft + targetRect.left - visibleLeft),
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      })
      return
    }

    canvas.scrollBy({
      left: direction * (columnWidthPx + COLUMN_CANVAS_GAP_PX),
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    })
  }

  if (!edges.canScrollLeft && !edges.canScrollRight) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="向左滚动一列"
        disabled={!edges.canScrollLeft}
        onClick={() => scrollByColumn(-1)}
        className="border-border/70 bg-background/85 hover:bg-accent rounded-full shadow-lg shadow-black/10 backdrop-blur"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="向右滚动一列"
        disabled={!edges.canScrollRight}
        onClick={() => scrollByColumn(1)}
        className="border-border/70 bg-background/85 hover:bg-accent rounded-full shadow-lg shadow-black/10 backdrop-blur"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function installHorizontalSelectionScrollGuard(canvas: HTMLDivElement) {
  let active = false
  let frame: number | null = null
  let canvasScrollLeft = 0
  let documentScrollLeft = 0
  let bodyScrollLeft = 0
  let windowScrollX = 0

  const restoreScrollPosition = () => {
    frame = null
    if (!active) return

    canvas.scrollLeft = canvasScrollLeft
    const scrollingElement = document.scrollingElement
    if (scrollingElement) scrollingElement.scrollLeft = documentScrollLeft
    if (document.body) document.body.scrollLeft = bodyScrollLeft
    if (window.scrollX !== windowScrollX) window.scrollTo(windowScrollX, window.scrollY)
  }

  const scheduleRestore = () => {
    if (active && frame === null) frame = window.requestAnimationFrame(restoreScrollPosition)
  }

  const handleSelectStart = (event: Event) => {
    if (!(event.target instanceof Node) || !canvas.contains(event.target)) return
    if (event.target instanceof Element && event.target.closest('[data-column-control]')) return

    active = true
    canvasScrollLeft = canvas.scrollLeft
    documentScrollLeft = document.scrollingElement?.scrollLeft ?? 0
    bodyScrollLeft = document.body?.scrollLeft ?? 0
    windowScrollX = window.scrollX
    scheduleRestore()
  }

  const stopGuard = () => {
    active = false
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }
  }

  const handleScroll = () => {
    if (active) restoreScrollPosition()
  }

  canvas.addEventListener('selectstart', handleSelectStart, true)
  canvas.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
  document.addEventListener('selectionchange', scheduleRestore)
  window.addEventListener('pointerup', stopGuard)
  window.addEventListener('pointercancel', stopGuard)
  window.addEventListener('mouseup', stopGuard)
  window.addEventListener('blur', stopGuard)

  return () => {
    stopGuard()
    canvas.removeEventListener('selectstart', handleSelectStart, true)
    canvas.removeEventListener('scroll', handleScroll)
    document.removeEventListener('scroll', handleScroll, true)
    document.removeEventListener('selectionchange', scheduleRestore)
    window.removeEventListener('pointerup', stopGuard)
    window.removeEventListener('pointercancel', stopGuard)
    window.removeEventListener('mouseup', stopGuard)
    window.removeEventListener('blur', stopGuard)
  }
}

export function reorderAuxiliaryColumns(
  columns: AuxiliaryColumn[],
  columnId: string,
  targetIndex: number,
): AuxiliaryColumn[] {
  const currentIndex = columns.findIndex((column) => column.id === columnId)
  if (currentIndex < 0 || columns.length < 2) return columns
  const nextIndex = Math.max(0, Math.min(Math.trunc(targetIndex), columns.length - 1))
  if (currentIndex === nextIndex) return columns
  return arrayMove(columns, currentIndex, nextIndex)
}

export function SortableColumnCanvas({
  auxiliaryColumns,
  columnWidthPx = COLUMN_WIDTH_PX.standard,
  focusedColumnId,
  shouldReduceMotion,
  assignMainScrollRef,
  contentMainRef,
  canvasScrollLeft = 0,
  onCanvasScrollLeftChange,
  onMoveColumn,
  onWidthColumn,
  onMainWidthChange,
  onRemoveColumn,
  children,
}: {
  auxiliaryColumns: AuxiliaryColumn[]
  columnWidthPx?: number
  focusedColumnId: string | null
  shouldReduceMotion: boolean
  assignMainScrollRef: (node: HTMLDivElement | null) => void
  contentMainRef: React.RefObject<HTMLElement | null>
  canvasScrollLeft?: number
  onCanvasScrollLeftChange?: (scrollLeft: number) => void
  onMoveColumn?: (columnId: string, targetIndex: number) => Promise<void>
  onWidthColumn?: (columnId: string, width: number) => Promise<void>
  onMainWidthChange?: (width: number) => Promise<void>
  onRemoveColumn?: (columnId: string) => void
  children: ReactNode
}) {
  const [displayedColumns, setDisplayedColumns] = useState(auxiliaryColumns)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [activePreviewNode, setActivePreviewNode] = useState<HTMLElement | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [mainColumnWidth, setMainColumnWidth] = useState(columnWidthPx)
  const mainColumnWidthRef = useRef(columnWidthPx)
  const mainResizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const auxiliaryColumnNodesRef = useRef(new Map<string, HTMLDivElement>())
  const savedCanvasScrollLeftRef = useRef(canvasScrollLeft)
  const restoringCanvasScrollRef = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const maxScrollLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth)
    const nextScrollLeft = Math.min(savedCanvasScrollLeftRef.current, maxScrollLeft)
    restoringCanvasScrollRef.current = true
    canvas.scrollLeft = nextScrollLeft
    canvas.dispatchEvent(new Event('scroll'))
    restoringCanvasScrollRef.current = false
    let rememberTimer = 0
    const rememberScroll = () => {
      if (restoringCanvasScrollRef.current) return
      savedCanvasScrollLeftRef.current = canvas.scrollLeft
      window.clearTimeout(rememberTimer)
      rememberTimer = window.setTimeout(() => {
        onCanvasScrollLeftChange?.(savedCanvasScrollLeftRef.current)
      }, 200)
    }
    canvas.addEventListener('scroll', rememberScroll, { passive: true })
    return () => {
      window.clearTimeout(rememberTimer)
      canvas.removeEventListener('scroll', rememberScroll)
    }
  }, [onCanvasScrollLeftChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return installHorizontalSelectionScrollGuard(canvas)
  }, [])

  const columns = activeColumnId || isSavingOrder ? displayedColumns : auxiliaryColumns
  const clampColumnWidth = (width: number) =>
    Math.round(Math.min(CUSTOM_COLUMN_WIDTH_MAX, Math.max(CUSTOM_COLUMN_WIDTH_MIN, width)))

  useEffect(() => {
    if (mainResizeStartRef.current) return
    mainColumnWidthRef.current = columnWidthPx
    setMainColumnWidth(columnWidthPx)
  }, [columnWidthPx])

  const finishMainResize = useCallback(async () => {
    if (!mainResizeStartRef.current) return
    mainResizeStartRef.current = null
    try {
      await onMainWidthChange?.(mainColumnWidthRef.current)
    } catch {
      mainColumnWidthRef.current = columnWidthPx
      setMainColumnWidth(columnWidthPx)
    }
  }, [columnWidthPx, onMainWidthChange])

  const handleMainResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || event.isPrimary === false) return
      event.preventDefault()
      event.stopPropagation()
      mainResizeStartRef.current = { startX: event.clientX, startWidth: mainColumnWidth }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [mainColumnWidth],
  )

  const handleMainResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const resize = mainResizeStartRef.current
      if (!resize) return
      const nextWidth = clampColumnWidth(resize.startWidth + event.clientX - resize.startX)
      mainColumnWidthRef.current = nextWidth
      setMainColumnWidth(nextWidth)
    },
    [],
  )

  const handleMainResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const previousWidth = mainColumnWidthRef.current
      const nextWidth =
        event.key === 'Home'
          ? CUSTOM_COLUMN_WIDTH_MIN
          : event.key === 'End'
            ? CUSTOM_COLUMN_WIDTH_MAX
            : clampColumnWidth(previousWidth + (event.key === 'ArrowRight' ? 10 : -10))
      mainColumnWidthRef.current = nextWidth
      setMainColumnWidth(nextWidth)
      void onMainWidthChange?.(nextWidth)
    },
    [onMainWidthChange],
  )

  useEffect(() => {
    if (!mainResizeStartRef.current) return
    const finishOnWindowBlur = () => void finishMainResize()
    window.addEventListener('blur', finishOnWindowBlur)
    return () => window.removeEventListener('blur', finishOnWindowBlur)
  }, [finishMainResize])

  useEffect(() => {
    if (!focusedColumnId) return
    const canvas = canvasRef.current
    const column = auxiliaryColumnNodesRef.current.get(focusedColumnId)
    if (!canvas || !column) return

    const canvasRect = canvas.getBoundingClientRect()
    const columnRect = column.getBoundingClientRect()
    const maxScrollLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth)
    const centeredScrollLeft =
      canvas.scrollLeft +
      columnRect.left -
      canvasRect.left -
      (canvas.clientWidth - columnRect.width) / 2
    const left = Math.max(0, Math.min(centeredScrollLeft, maxScrollLeft))
    canvas.scrollTo?.({ left, behavior: shouldReduceMotion ? 'auto' : 'smooth' })
  }, [focusedColumnId, shouldReduceMotion])

  const columnIds = useMemo(() => columns.map((column) => column.id), [columns])

  const persistMove = useCallback(
    async (columnId: string, targetIndex: number) => {
      if (isSavingOrder || !onMoveColumn) return
      const previousColumns = columns
      const nextColumns = reorderAuxiliaryColumns(previousColumns, columnId, targetIndex)
      if (nextColumns === previousColumns) return

      setDisplayedColumns(nextColumns)
      setIsSavingOrder(true)
      try {
        await onMoveColumn(columnId, targetIndex)
      } catch {
        setDisplayedColumns(previousColumns)
        toast.error('无法保存列顺序，已恢复原顺序')
      } finally {
        setIsSavingOrder(false)
      }
    },
    [columns, isSavingOrder, onMoveColumn],
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const columnId = String(event.active.id)
      setDisplayedColumns(auxiliaryColumns)
      setActiveColumnId(columnId)
      setActivePreviewNode(auxiliaryColumnNodesRef.current.get(columnId) ?? null)
    },
    [auxiliaryColumns],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveColumnId(null)
      setActivePreviewNode(null)
      if (!event.over || event.active.id === event.over.id) return
      const targetIndex = columns.findIndex((column) => column.id === event.over?.id)
      if (targetIndex >= 0) void persistMove(String(event.active.id), targetIndex)
    },
    [columns, persistMove],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      autoScroll={{ canScroll: (element) => element.hasAttribute('data-column-canvas') }}
      accessibility={{
        screenReaderInstructions: {
          draggable: '拖动可调整列顺序；单击可打开列操作菜单。',
        },
      }}
      onDragStart={handleDragStart}
      onDragCancel={() => {
        setActiveColumnId(null)
        setActivePreviewNode(null)
      }}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={canvasRef}
        data-column-canvas
        className="xb-column-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          className="flex h-full w-max min-w-full justify-center-safe px-3"
          style={{ gap: COLUMN_CANVAS_GAP_PX }}
        >
          <section
            data-primary-column
            className="bg-background relative h-full shrink-0 overflow-hidden border-x"
            style={{ width: mainColumnWidth }}
          >
            <button
              type="button"
              role="separator"
              aria-orientation="vertical"
              aria-label="调整主列宽"
              aria-valuemin={CUSTOM_COLUMN_WIDTH_MIN}
              aria-valuemax={CUSTOM_COLUMN_WIDTH_MAX}
              aria-valuenow={mainColumnWidth}
              data-column-control
              className="hover:bg-primary/20 focus-visible:bg-primary/20 absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-inset"
              onPointerDown={handleMainResizePointerDown}
              onPointerMove={handleMainResizePointerMove}
              onPointerUp={() => void finishMainResize()}
              onPointerCancel={() => void finishMainResize()}
              onLostPointerCapture={() => void finishMainResize()}
              onKeyDown={handleMainResizeKeyDown}
            />
            <div ref={assignMainScrollRef} className="xb-column-scroll h-full overflow-y-auto">
              <main id="xb-main-content" tabIndex={-1} ref={contentMainRef} className="min-w-0">
                {children}
              </main>
            </div>
          </section>
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column, index) => (
              <div
                key={column.id}
                ref={(node) => {
                  if (node) auxiliaryColumnNodesRef.current.set(column.id, node)
                  else auxiliaryColumnNodesRef.current.delete(column.id)
                }}
                className="shrink-0"
              >
                <AuxiliaryColumnView
                  column={column}
                  columnWidthPx={columnWidthPx}
                  index={index}
                  columnCount={columns.length}
                  sortingDisabled={isSavingOrder}
                  shouldReduceMotion={shouldReduceMotion}
                  onMove={(columnId, targetIndex) => void persistMove(columnId, targetIndex)}
                  onWidthChange={onWidthColumn}
                  onRemove={(columnId) => onRemoveColumn?.(columnId)}
                />
              </div>
            ))}
          </SortableContext>
        </div>
      </div>
      <ColumnScrollButtons
        canvasRef={canvasRef}
        columnWidthPx={columnWidthPx}
        columnCount={columns.length}
        shouldReduceMotion={shouldReduceMotion}
      />
      <DragOverlay
        adjustScale={false}
        dropAnimation={
          shouldReduceMotion ? null : { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
        }
      >
        {activePreviewNode ? <ColumnDragPreview source={activePreviewNode} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
