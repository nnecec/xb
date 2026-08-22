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
import { GripVertical } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AuxiliaryColumnView } from '@/lib/weibo/workspace/auxiliary-column'
import { type AuxiliaryColumn, columnSourceTitle } from '@/lib/weibo/workspace/workspace-store'

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 })

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
  focusedColumnId,
  shouldReduceMotion,
  assignMainScrollRef,
  contentMainRef,
  onFocusColumn,
  onMoveColumn,
  onRemoveColumn,
  children,
}: {
  auxiliaryColumns: AuxiliaryColumn[]
  focusedColumnId: string | null
  shouldReduceMotion: boolean
  assignMainScrollRef: (node: HTMLDivElement | null) => void
  contentMainRef: React.RefObject<HTMLElement | null>
  onFocusColumn?: (columnId: string | null) => void
  onMoveColumn?: (columnId: string, targetIndex: number) => Promise<void>
  onRemoveColumn?: (columnId: string) => void
  children: ReactNode
}) {
  const [displayedColumns, setDisplayedColumns] = useState(auxiliaryColumns)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const auxiliaryColumnNodesRef = useRef(new Map<string, HTMLDivElement>())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!activeColumnId && !isSavingOrder) setDisplayedColumns(auxiliaryColumns)
  }, [activeColumnId, auxiliaryColumns, isSavingOrder])

  useEffect(() => {
    if (!focusedColumnId) return
    auxiliaryColumnNodesRef.current.get(focusedColumnId)?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [focusedColumnId, shouldReduceMotion])

  const activeColumn = useMemo(
    () => displayedColumns.find((column) => column.id === activeColumnId) ?? null,
    [activeColumnId, displayedColumns],
  )
  const columnIds = useMemo(() => displayedColumns.map((column) => column.id), [displayedColumns])

  const persistMove = useCallback(
    async (columnId: string, targetIndex: number) => {
      if (isSavingOrder || !onMoveColumn) return
      const previousColumns = displayedColumns
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
    [displayedColumns, isSavingOrder, onMoveColumn],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveColumnId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveColumnId(null)
      if (!event.over || event.active.id === event.over.id) return
      const targetIndex = displayedColumns.findIndex((column) => column.id === event.over?.id)
      if (targetIndex >= 0) void persistMove(String(event.active.id), targetIndex)
    },
    [displayedColumns, persistMove],
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
      <div data-column-canvas className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full w-max min-w-full justify-center gap-3 px-3">
          <section
            data-primary-column
            className="bg-background h-full w-[420px] shrink-0 overflow-hidden rounded-lg border"
          >
            <div ref={assignMainScrollRef} className="h-full overflow-y-auto">
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
            {displayedColumns.map((column, index) => (
              <div
                key={column.id}
                ref={(node) => {
                  if (node) auxiliaryColumnNodesRef.current.set(column.id, node)
                  else auxiliaryColumnNodesRef.current.delete(column.id)
                }}
                className="shrink-0"
                onPointerDown={(event) => {
                  const target = event.target
                  if (target instanceof Element && target.closest('[data-column-control]')) return
                  onFocusColumn?.(column.id)
                }}
              >
                <AuxiliaryColumnView
                  column={column}
                  index={index}
                  columnCount={displayedColumns.length}
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
      <DragOverlay
        adjustScale={false}
        dropAnimation={
          shouldReduceMotion ? null : { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
        }
      >
        {activeColumn ? (
          <div className="bg-background flex h-12 w-[420px] items-center gap-2 rounded-lg border px-3 shadow-lg">
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
