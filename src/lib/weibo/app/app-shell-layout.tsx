import { cn } from 'cn'
import { Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import type { AppTheme } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
export { useAppShellContext } from '@/lib/weibo/app/app-shell-context'
import { resolveColumnWidthPx } from '@/lib/weibo/app/column-width'
import { ImmersiveHeaderHiddenContext } from '@/lib/weibo/app/immersive-header'
import { NavigationRail } from '@/lib/weibo/components/navigation-rail'
import {
  PAGE_KINDS_WITH_SCROLL_RESTORATION,
  type WeiboPageDescriptor,
} from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'
import { forwardBlankAreaWheelToMainColumn } from '@/lib/weibo/workspace/blank-area-wheel'
import { SortableColumnCanvas } from '@/lib/weibo/workspace/sortable-column-canvas'
import type { AuxiliaryColumn } from '@/lib/weibo/workspace/workspace-store'

/** Routes whose primary feed scrolls inside ShellFrame `<main>` (timeline + profile posts). */
function mainScrollRestorationKey(pathname: string, search: string): string | null {
  const page = parseWeiboUrl(new URL(`${pathname}${search}`, window.location.origin).href)
  if (PAGE_KINDS_WITH_SCROLL_RESTORATION.has(page.kind)) {
    return `${pathname}${search}`
  }
  return null
}

export function getContentColumnOffset(previousLeft: number, nextLeft: number): number | null {
  const offset = previousLeft - nextLeft
  return Number.isFinite(offset) && Math.abs(offset) >= 1 ? offset : null
}

export function scheduleContentColumnAnimation(
  onCenter: FrameRequestCallback,
  requestFrame: (callback: FrameRequestCallback) => number = window.requestAnimationFrame,
) {
  return requestFrame(() => {
    requestFrame(onCenter)
  })
}

interface ContentColumnMotionValue {
  get: () => number
  set: (value: number) => void
}

type ContentColumnAnimate = (
  motionX: ContentColumnMotionValue,
  target: number,
  transition: { duration: number; ease?: readonly [number, number, number, number] },
) => { stop: () => void }

export function startContentColumnTransition({
  motionX,
  offset,
  transition,
  animateTo,
  requestFrame = window.requestAnimationFrame,
}: {
  motionX: ContentColumnMotionValue
  offset: number
  transition: { duration: number; ease?: readonly [number, number, number, number] }
  animateTo?: ContentColumnAnimate
  requestFrame?: (callback: FrameRequestCallback) => number
}) {
  motionX.set(offset)
  return scheduleContentColumnAnimation(() => {
    animateTo?.(motionX, 0, transition)
  }, requestFrame)
}

interface ShellFrameProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onSettingsOpen: () => void
  onComposeOpen: () => void
  onSidebarCollapsedChange?: (collapsed: boolean) => void
  auxiliaryColumns?: AuxiliaryColumn[]
  onColumnPickerOpen?: () => void
  onRemoveAuxiliaryColumn?: (columnId: string) => void
  onMoveAuxiliaryColumn?: (columnId: string, targetIndex: number) => Promise<void>
  onWidthAuxiliaryColumn?: (columnId: string, width: number) => Promise<void>
  onMainWidthChange?: (width: number) => Promise<void>
  onFocusAuxiliaryColumn?: (columnId: string | null) => void
  focusedColumnId?: string | null
  mainRef: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}

export function ShellFrame({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  onSettingsOpen,
  onComposeOpen,
  onSidebarCollapsedChange,
  auxiliaryColumns = [],
  onColumnPickerOpen,
  onRemoveAuxiliaryColumn,
  onMoveAuxiliaryColumn,
  onWidthAuxiliaryColumn,
  onMainWidthChange,
  onFocusAuxiliaryColumn,
  focusedColumnId,
  mainRef,
  children,
}: ShellFrameProps) {
  const location = useLocation()
  const savedMainScrollByRouteRef = useRef<Partial<Record<string, number>>>({})
  const savedScrollAnchorByRouteRef = useRef<Partial<Record<string, string>>>({})
  const locationRef = useRef(location)
  useLayoutEffect(() => {
    locationRef.current = location
  }, [location])
  const columnWidthPx = useAppSettings((state) =>
    resolveColumnWidthPx(state.columnWidth, state.customColumnWidth),
  )
  const shouldReduceMotion = useReducedMotion()
  const contentMainRef = useRef<HTMLElement | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const assignShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      mainRef.current = node
    },
    [mainRef],
  )

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const onScroll = () => {
      const { pathname, search } = locationRef.current
      const key = mainScrollRestorationKey(pathname, search)
      if (!key) return
      savedMainScrollByRouteRef.current[key] = main.scrollTop
      for (const element of Array.from(main.querySelectorAll('[data-feed-id]'))) {
        const rect = element.getBoundingClientRect()
        if (rect.top >= -100 && rect.top < window.innerHeight) {
          const feedId = element.getAttribute('data-feed-id')
          if (feedId) savedScrollAnchorByRouteRef.current[key] = feedId
          break
        }
      }
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [mainRef])

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const onWheel = (event: WheelEvent) => {
      forwardBlankAreaWheelToMainColumn(event, workspace, mainRef.current)
    }
    workspace.addEventListener('wheel', onWheel, { passive: false })
    return () => workspace.removeEventListener('wheel', onWheel)
  }, [mainRef])

  useLayoutEffect(() => {
    const main = mainRef.current
    const key = mainScrollRestorationKey(location.pathname, location.search)
    if (!main || !key) return
    const y = savedMainScrollByRouteRef.current[key] ?? 0
    const anchorId = savedScrollAnchorByRouteRef.current[key]
    const restore = () => {
      const anchor = anchorId
        ? (main.querySelector(`[data-feed-id="${anchorId}"]`) as HTMLElement | null)
        : null
      main.scrollTop = anchor ? anchor.offsetTop - 100 : y
    }
    restore()
    let lastHeight = main.scrollHeight
    let stableChecks = 0
    let checks = 0
    let timerId = 0
    const check = () => {
      checks += 1
      if (main.scrollHeight !== lastHeight) {
        restore()
        lastHeight = main.scrollHeight
        stableChecks = 0
      } else {
        stableChecks += 1
      }
      if (stableChecks < 3 && checks < 20) timerId = window.setTimeout(check, 100)
    }
    timerId = window.setTimeout(check, 100)
    return () => window.clearTimeout(timerId)
  }, [location.pathname, location.search, mainRef])

  return (
    <ImmersiveHeaderHiddenContext.Provider value={false}>
      <div
        ref={workspaceRef}
        className="bg-background text-foreground flex h-screen overflow-hidden"
      >
        <a
          href="#xb-main-content"
          className="bg-background text-foreground focus-visible:ring-ring fixed top-2 left-2 z-[100] -translate-y-20 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-transform outline-none focus-visible:translate-y-0 focus-visible:ring-3"
          onClick={(event) => {
            event.preventDefault()
            contentMainRef.current?.focus()
          }}
        >
          跳到主要内容
        </a>
        <div className="h-screen shrink-0">
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
            onSettingsOpen={onSettingsOpen}
            onComposeOpen={onComposeOpen}
            onColumnPickerOpen={onColumnPickerOpen}
            onPrimaryNavigate={() => onFocusAuxiliaryColumn?.(null)}
            onSidebarCollapsedChange={onSidebarCollapsedChange ?? (() => undefined)}
          />
        </div>
        <SortableColumnCanvas
          auxiliaryColumns={auxiliaryColumns}
          columnWidthPx={columnWidthPx}
          focusedColumnId={focusedColumnId ?? null}
          shouldReduceMotion={Boolean(shouldReduceMotion)}
          assignMainScrollRef={assignShellRef}
          contentMainRef={contentMainRef}
          onMoveColumn={onMoveAuxiliaryColumn}
          onWidthColumn={onWidthAuxiliaryColumn}
          onMainWidthChange={onMainWidthChange}
          onRemoveColumn={onRemoveAuxiliaryColumn}
        >
          {children}
        </SortableColumnCanvas>
      </div>
    </ImmersiveHeaderHiddenContext.Provider>
  )
}

export function RewritePausedCard({ onResume }: { onResume: () => void }) {
  const collapsed = useAppSettings((state) => state.xbEntryCollapsed)
  const updateSettings = useAppSettings((state) => state.updateSettings)
  const shouldReduceMotion = useReducedMotion()
  const bodyTransition = shouldReduceMotion
    ? undefined
    : 'grid-template-rows 280ms cubic-bezier(0.23, 1, 0.32, 1)'

  const toggleCollapsed = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    void updateSettings({ xbEntryCollapsed: !collapsed })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onResume()
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-2147483647">
      <div
        data-testid="xb-entry"
        data-state={collapsed ? 'collapsed' : 'expanded'}
        onClick={collapsed ? onResume : undefined}
        onKeyDown={collapsed ? handleKeyDown : undefined}
        role={collapsed ? 'button' : undefined}
        tabIndex={collapsed ? 0 : undefined}
        aria-label={collapsed ? '进入 xb 模式' : undefined}
        title={collapsed ? '进入 xb 模式' : undefined}
        className={cn(
          'bg-card/95 border-border/70 overflow-hidden shadow-lg shadow-black/5 backdrop-blur',
          'flex flex-col pl-3',
          collapsed ? 'w-[110px] rounded-[18px] py-0 pr-1' : 'w-[240px] rounded-lg py-3 pr-3',
          collapsed &&
            'cursor-pointer hover:bg-card focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
        )}
      >
        <div className="flex h-9 w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">xb</span>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开 xb 模式' : '收起 xb 模式入口'}
            title={collapsed ? '展开 xb 模式' : '收起'}
            data-testid={collapsed ? 'xb-corner-expand' : 'xb-corner-collapse'}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'relative inline-flex size-8 items-center justify-center rounded-full',
              'after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2',
              'transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]',
            )}
          >
            {collapsed ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div
          className={cn('grid', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}
          style={{ transition: bodyTransition }}
        >
          <div className="overflow-hidden">
            <div
              data-testid="xb-entry-body"
              className={cn(
                'flex flex-col gap-2',
                shouldReduceMotion
                  ? undefined
                  : 'transition-opacity duration-[280ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
              )}
              style={{ opacity: collapsed ? 0 : 1 }}
            >
              <p className="text-muted-foreground text-xs leading-snug">
                一键切换「更清爽、更 X 的」超级体验
              </p>
              <button
                type="button"
                onClick={onResume}
                data-testid="xb-entry-cta"
                className={cn(
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'inline-flex items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium',
                  'transition-transform duration-150 ease-out active:scale-[0.96]',
                )}
              >
                <span>Let&apos;s xb!</span>
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
