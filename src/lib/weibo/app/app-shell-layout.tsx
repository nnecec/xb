import { Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router'

import type { AppTheme, ContentWidth } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import type { AppShellContext } from '@/lib/weibo/app/app-shell'
import { BackToTop } from '@/lib/weibo/components/back-to-top'
import { NavigationRail } from '@/lib/weibo/components/navigation-rail'
import { RightRail } from '@/lib/weibo/components/right-rail'
import {
  PAGE_KINDS_WITH_SCROLL_RESTORATION,
  type WeiboPageDescriptor,
} from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'

/** Routes whose primary feed scrolls inside ShellFrame `<main>` (timeline + profile posts). */
function mainScrollRestorationKey(pathname: string, search: string): string | null {
  const page = parseWeiboUrl(new URL(`${pathname}${search}`, window.location.origin).href)
  if (PAGE_KINDS_WITH_SCROLL_RESTORATION.has(page.kind)) {
    return `${pathname}${search}`
  }
  return null
}

interface ShellFrameProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  contentWidth: ContentWidth
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onSettingsOpen: () => void
  onComposeOpen: () => void
  mainRef: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}

export function useAppShellContext() {
  return useOutletContext<AppShellContext>()
}

export function ShellFrame({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  contentWidth,
  onRewriteEnabledChange,
  onThemeChange,
  onSettingsOpen,
  onComposeOpen,
  mainRef,
  children,
}: ShellFrameProps) {
  const location = useLocation()
  const savedMainScrollByRouteRef = useRef<Partial<Record<string, number>>>({})
  const savedScrollAnchorByRouteRef = useRef<Partial<Record<string, string>>>({})
  const locationRef = useRef(location)
  locationRef.current = location
  const showRightRail = useAppSettings((state) => state.showRightRail)
  const updateSettings = useAppSettings((state) => state.updateSettings)

  const [mainScrollRoot, setMainScrollRoot] = useState<HTMLDivElement | null>(null)
  const assignShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      mainRef.current = node
      setMainScrollRoot((prev) => (prev === node ? prev : node))
    },
    [mainRef],
  )

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }
    const onScroll = () => {
      const { pathname, search } = locationRef.current
      const key = mainScrollRestorationKey(pathname, search)
      if (key) {
        savedMainScrollByRouteRef.current[key] = main.scrollTop

        // Save the ID of the first visible feed item in viewport
        const feedElements = Array.from(main.querySelectorAll('[data-feed-id]')) as HTMLElement[]
        for (const element of feedElements) {
          const rect = element.getBoundingClientRect()
          if (rect.top >= -100 && rect.top < window.innerHeight) {
            const feedId = element.getAttribute('data-feed-id')
            if (feedId) {
              savedScrollAnchorByRouteRef.current[key] = feedId
            }
            break
          }
        }
      }
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [mainRef])

  useLayoutEffect(() => {
    const main = mainRef.current
    const key = mainScrollRestorationKey(location.pathname, location.search)
    if (!main || !key) {
      return
    }
    const y = savedMainScrollByRouteRef.current[key] ?? 0
    const anchorId = savedScrollAnchorByRouteRef.current[key]

    // Prefer anchor-based restoration over pixel-based
    if (anchorId) {
      const anchorElement = main.querySelector(`[data-feed-id="${anchorId}"]`) as HTMLElement | null
      if (anchorElement) {
        // Scroll anchor element to the same viewport position as when saved
        const targetScrollTop = anchorElement.offsetTop - 100
        main.scrollTop = targetScrollTop
      } else {
        // Fallback to pixel position if anchor element not found
        main.scrollTop = y
      }
    } else {
      main.scrollTop = y
    }

    // Monitor content height changes and re-anchor
    let lastScrollHeight = main.scrollHeight
    let stableCount = 0
    let checkCount = 0
    const maxChecks = 20
    const requiredStableChecks = 3

    const checkAndCorrect = () => {
      checkCount++
      const currentScrollHeight = main.scrollHeight
      const heightChanged = currentScrollHeight !== lastScrollHeight

      if (heightChanged) {
        // Re-anchor when content height changes
        if (anchorId) {
          const anchorElement = main.querySelector(
            `[data-feed-id="${anchorId}"]`,
          ) as HTMLElement | null
          if (anchorElement) {
            const targetScrollTop = anchorElement.offsetTop - 100
            main.scrollTop = targetScrollTop
          }
        }
        stableCount = 0
      } else {
        stableCount++
      }

      lastScrollHeight = currentScrollHeight

      if (stableCount < requiredStableChecks && checkCount < maxChecks) {
        timerId = setTimeout(checkAndCorrect, 100)
      }
    }

    let timerId = setTimeout(checkAndCorrect, 100)

    return () => clearTimeout(timerId)
  }, [location.pathname, location.search, mainRef])

  const contentWidthClass: Record<ContentWidth, string> = {
    standard: 'lg:max-w-[1000px] xl:max-w-[1200px]',
    wide: 'lg:max-w-[1100px] xl:max-w-[1300px]',
    wider: 'lg:max-w-[1200px] xl:max-w-[1400px]',
  }

  return (
    <div
      className="bg-background text-foreground flex h-screen flex-col overflow-y-auto"
      ref={assignShellRef}
    >
      <div
        className={cn('relative mx-auto flex w-full gap-3 px-3', contentWidthClass[contentWidth])}
      >
        <div className="sticky top-0 h-screen shrink-0">
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
            onSettingsOpen={onSettingsOpen}
            onComposeOpen={onComposeOpen}
            onSidebarCollapsedChange={(collapsed) =>
              updateSettings({ sidebarCollapsed: collapsed })
            }
          />
        </div>
        <main className="min-w-0 flex-1 pb-8">{children}</main>
        {showRightRail && (
          <div className={cn('sticky top-0 h-screen shrink-0 w-[260px]')}>
            <RightRail />
            <BackToTop scrollRoot={mainScrollRoot} />
          </div>
        )}
      </div>
    </div>
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
