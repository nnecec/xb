import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { MoreHorizontal } from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import {
  cloneElement,
  createContext,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { getUiPortalContainer } from '@/components/ui/portal'
import { cn } from '@/lib/utils'

const ColumnControlsContext = createContext<ReactNode>(null)
const ColumnDragListenersContext = createContext<DraggableSyntheticListeners>(undefined)
const ColumnDragActivatorContext = createContext<((element: HTMLElement | null) => void) | null>(
  null,
)
const ColumnMenuContext = createContext<ReactNode>(null)

export function ColumnToolbarDragProvider({
  children,
  listeners,
  setActivatorNodeRef,
  menu,
}: {
  children: ReactNode
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
  menu: ReactNode
}) {
  return (
    <ColumnDragListenersContext.Provider value={listeners}>
      <ColumnDragActivatorContext.Provider value={setActivatorNodeRef}>
        <ColumnMenuContext.Provider value={menu}>{children}</ColumnMenuContext.Provider>
      </ColumnDragActivatorContext.Provider>
    </ColumnDragListenersContext.Provider>
  )
}

const COLUMN_TOOLBAR_CONTROL_SELECTOR =
  'button,a,[role="button"],[role="menuitem"],input,select,textarea,[data-column-control]'

export function isColumnToolbarControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(COLUMN_TOOLBAR_CONTROL_SELECTOR) !== null
}

export function ColumnToolbarDragRegion({ children }: { children: ReactNode }) {
  const listeners = useContext(ColumnDragListenersContext)
  const setActivatorNodeRef = useContext(ColumnDragActivatorContext)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isDragging) return
    const root = document.documentElement
    const previousCursor = root.style.cursor
    root.style.cursor = 'grabbing'
    const stopDragging = () => setIsDragging(false)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    window.addEventListener('blur', stopDragging)
    return () => {
      root.style.cursor = previousCursor
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
      window.removeEventListener('blur', stopDragging)
    }
  }, [isDragging])

  const guardedListeners = useMemo(() => {
    if (!listeners) return undefined
    const isControlTarget = (event: React.SyntheticEvent) =>
      isColumnToolbarControlTarget(event.target) ||
      (event.target instanceof Element &&
        event.target.closest('[role="menu"],[data-column-title-control]') !== null)
    return {
      ...listeners,
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (isControlTarget(event)) return
        listeners.onPointerDown?.(event)
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setIsDragging(true)
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (!isControlTarget(event)) listeners.onKeyDown?.(event)
      },
    }
  }, [listeners])

  if (!setActivatorNodeRef || !isValidElement(children)) return children
  return cloneElement(
    children as ReactElement<{
      className?: string
      ref?: (element: HTMLElement | null) => void
    }>,
    {
      ref: setActivatorNodeRef,
      ...guardedListeners,
      className: cn(
        'cursor-grab active:cursor-grabbing',
        (children.props as { className?: string }).className,
      ),
    },
  )
}

export function ColumnToolbarMenuButton() {
  const menu = useContext(ColumnMenuContext)
  if (!menu) return null
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="列操作"
          data-column-control
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal container={getUiPortalContainer()}>
        <DropdownMenuPrimitive.Content className="bg-popover text-popover-foreground z-50 min-w-[11rem] overflow-hidden rounded-md border p-1 shadow-md">
          {menu}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export function ColumnToolbarMenuItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export const ColumnToolbarMenuSeparator = DropdownMenuPrimitive.Separator

export function ColumnControlsProvider({
  children,
  controls,
}: {
  children: ReactNode
  controls: ReactNode
}) {
  return (
    <ColumnControlsContext.Provider value={controls}>{children}</ColumnControlsContext.Provider>
  )
}

export function useColumnControls(): ReactNode {
  return useContext(ColumnControlsContext)
}
