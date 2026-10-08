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
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { COLUMN_WIDTH_PX } from '@/lib/app-settings'
import { AuxiliaryColumnView } from '@/lib/weibo/workspace/auxiliary-column'
import { type AuxiliaryColumn, columnSourceTitle } from '@/lib/weibo/workspace/workspace-store'

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 })

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
  onMoveColumn,
  onRemoveColumn,
  children,
}: {
  auxiliaryColumns: AuxiliaryColumn[]
  columnWidthPx?: number
  focusedColumnId: string | null
  shouldReduceMotion: boolean
  assignMainScrollRef: (node: HTMLDivElement | null) => void
  contentMainRef: React.RefObject<HTMLElement | null>
  onMoveColumn?: (columnId: string, targetIndex: number) => Promise<void>
  onRemoveColumn?: (columnId: string) => void
  children: ReactNode
}) {
  const [displayedColumns, setDisplayedColumns] = useState(auxiliaryColumns)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const auxiliaryColumnNodesRef = useRef(new Map<string, HTMLDivElement>())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return installHorizontalSelectionScrollGuard(canvas)
  }, [])

  const columns = activeColumnId || isSavingOrder ? displayedColumns : auxiliaryColumns

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

  const activeColumn = useMemo(
    () => columns.find((column) => column.id === activeColumnId) ?? null,
    [activeColumnId, columns],
  )
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
      setDisplayedColumns(auxiliaryColumns)
      setActiveColumnId(String(event.active.id))
    },
    [auxiliaryColumns],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveColumnId(null)
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
      onDragCancel={() => setActiveColumnId(null)}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={canvasRef}
        data-column-canvas
        className="xb-column-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div
          className="flex h-full w-max min-w-full justify-center px-3"
          style={{ gap: COLUMN_CANVAS_GAP_PX }}
        >
          <section
            data-primary-column
            className="bg-background h-full shrink-0 overflow-hidden border-x"
            style={{ width: columnWidthPx }}
          >
            <div ref={assignMainScrollRef} className="xb-column-scroll h-full overflow-y-auto">
              <main
                id="xb-main-content"
                tabIndex={-1}
                ref={contentMainRef}
                className="min-w-0 px-2 pb-8"
              >
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
        {activeColumn ? (
          <div
            className="bg-background flex h-12 items-center gap-2 rounded-lg border px-3 shadow-lg"
            style={{ width: columnWidthPx }}
          >
            <GripVertical className="text-muted-foreground size-4" aria-hidden="true" />
            <span className="truncate text-sm font-semibold">
              {columnSourceTitle(activeColumn.source)}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
