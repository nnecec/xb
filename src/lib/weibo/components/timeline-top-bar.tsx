import { cn } from 'cn'
import { ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCWIcon } from '@/components/ui/refresh-cw'
import { useImmersiveHeaderClassName } from '@/lib/weibo/app/immersive-header'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import {
  ColumnToolbarDragRegion,
  ColumnToolbarMenuButton,
  isColumnToolbarControlTarget,
  useColumnControls,
} from '@/lib/weibo/workspace/column-controls'
import { ColumnRefreshButton } from '@/lib/weibo/workspace/column-page-toolbar'

export interface TimelineTopBarOption<Value extends string = string> {
  value: Value
  label: string
}

export interface TimelineTopBarOptionGroup<Value extends string = string> {
  label?: string
  className?: string
  options: TimelineTopBarOption<Value>[]
}

interface TimelineTopBarProps<TitleValue extends string = string> {
  title: string
  description?: string
  titleValue?: TitleValue
  titleOptions?: TimelineTopBarOption<TitleValue>[]
  titleOptionGroups?: TimelineTopBarOptionGroup<TitleValue>[]
  onTitleChange?: (value: TitleValue) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  rightAction?: ReactNode
  children?: ReactNode
}

export function TimelineTopBar<TitleValue extends string = string>({
  title,
  description,
  titleValue,
  titleOptions,
  titleOptionGroups,
  onTitleChange,
  onRefresh,
  isRefreshing = false,
  rightAction,
  children,
}: TimelineTopBarProps<TitleValue>) {
  const runtime = usePageRuntime()
  const columnControls = useColumnControls()
  const scrollColumnToTop = () => {
    runtime.scrollToTop()
  }
  const headerClassName = useImmersiveHeaderClassName(
    'bg-background/70 border-border/40 sticky top-0 z-50 border-b backdrop-blur-lg',
  )
  const activeTitleValue =
    titleValue ?? titleOptions?.find((option) => option.label === title)?.value ?? title
  const menuGroups =
    titleOptionGroups ??
    (titleOptions && titleOptions.length > 1 ? [{ options: titleOptions }] : [])
  const visibleMenuGroups = onTitleChange
    ? menuGroups.filter((group) => group.options.length > 0)
    : []
  const showMenu = visibleMenuGroups.length > 0
  return (
    <ColumnToolbarDragRegion>
      <div
        className={headerClassName}
        onClick={(event) => {
          if (isColumnToolbarControlTarget(event.target)) return
          scrollColumnToTop()
        }}
      >
        <h1 className="sr-only">{title}</h1>
        <div className="relative flex min-h-16 items-center justify-between">
          <div className="flex min-w-0 items-center">
            {columnControls}
            {!columnControls && runtime.canGoBack ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="返回"
                data-column-control
                className="shrink-0"
                onClick={runtime.back}
              >
                <ArrowLeft className="size-4" />
              </Button>
            ) : null}
            {showMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="min-w-0"
                    data-column-control
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <span className="text-foreground truncate text-lg font-semibold">{title}</span>
                    <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {visibleMenuGroups.map((group, groupIndex) => (
                    <Fragment key={group.label ?? groupIndex}>
                      {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuGroup className={group.className}>
                        {group.label ? (
                          <DropdownMenuLabel className="text-muted-foreground text-xs">
                            {group.label}
                          </DropdownMenuLabel>
                        ) : null}
                        {group.options.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => onTitleChange?.(option.value)}
                            className="justify-between"
                          >
                            <span className="truncate">{option.label}</span>
                            {option.value === activeTitleValue ? (
                              <Check className="size-4" />
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="text-foreground truncate px-2 py-1 text-xl font-semibold">
                {title}
              </div>
            )}

            <div className="flex h-full flex-col items-center justify-end gap-1">
              {description ? (
                <p className="text-muted-foreground truncate px-2 text-xs leading-4">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {rightAction}
            {onRefresh ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="刷新"
                data-column-control
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCWIcon className={cn('size-3', isRefreshing && 'animate-spin')} />
              </Button>
            ) : (
              <ColumnRefreshButton />
            )}
            <ColumnToolbarMenuButton />
          </div>

          {children}
        </div>
      </div>
    </ColumnToolbarDragRegion>
  )
}
