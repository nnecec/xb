import { Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useOutletContext } from 'react-router'

import type { AppTheme, ContentWidth } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import type { AppShellContext } from '@/lib/weibo/app/app-shell'
import { getContentWidthAdjustedMaxWidth } from '@/lib/weibo/app/content-width'
import { ImmersiveHeaderHiddenContext } from '@/lib/weibo/app/immersive-header'
import { BackToTop } from '@/lib/weibo/components/back-to-top'
import { ImmersiveExitRail, NavigationRail } from '@/lib/weibo/components/navigation-rail'
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
  animateTo = (value, target, options) => {
    const playback = animate(value as never, target, options)
    return { stop: () => playback.stop() }
  },
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
    animateTo(motionX, 0, transition)
  }, requestFrame)
}

const immersiveChromeTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1] as const,
}

const immersiveColumnTransition = {
  duration: 0.28,
  ease: [0.23, 1, 0.32, 1] as const,
}

const reducedMotionChromeTransition = { duration: 0.12 }

const immersiveChromeStyle = { willChange: 'transform, opacity' }

interface ShellFrameProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  contentWidth: ContentWidth
  customContentWidth: number
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
  customContentWidth,
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
  const immersiveMode = useAppSettings((state) => state.immersiveMode)
  const updateSettings = useAppSettings((state) => state.updateSettings)
  const shouldReduceMotion = useReducedMotion()
  const contentColumnX = useMotionValue(0)

  const [mainScrollRoot, setMainScrollRoot] = useState<HTMLDivElement | null>(null)
  const [areImmersiveHeadersHidden, setAreImmersiveHeadersHidden] = useState(false)
  const [immersiveColumnWidth, setImmersiveColumnWidth] = useState<number | null>(null)
  const contentMainRef = useRef<HTMLElement | null>(null)
  const contentColumnPreviousLeftRef = useRef<number | null>(null)
  const contentColumnFrameRef = useRef<number | null>(null)
  const contentColumnAnimateStopRef = useRef<(() => void) | null>(null)
  const lastScrollTopRef = useRef(0)
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null)
  const scrollDirectionStartRef = useRef(0)
  const assignShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      mainRef.current = node
      setMainScrollRoot((prev) => (prev === node ? prev : node))
    },
    [mainRef],
  )
  const handleImmersiveModeChange = useCallback(
    (enabled: boolean) => {
      if (enabled === immersiveMode) {
        return
      }
      const rect = contentMainRef.current?.getBoundingClientRect()
      contentColumnPreviousLeftRef.current = rect && Number.isFinite(rect.left) ? rect.left : null

      flushSync(() => {
        if (enabled && rect?.width && Number.isFinite(rect.width)) {
          setImmersiveColumnWidth(rect.width)
        }
        void updateSettings({ immersiveMode: enabled })
      })
    },
    [immersiveMode, updateSettings],
  )

  useEffect(
    () => () => {
      if (contentColumnFrameRef.current !== null) {
        window.cancelAnimationFrame(contentColumnFrameRef.current)
      }
      contentColumnAnimateStopRef.current?.()
    },
    [],
  )

  useLayoutEffect(() => {
    const previousLeft = contentColumnPreviousLeftRef.current
    if (previousLeft === null) {
      return
    }
    contentColumnPreviousLeftRef.current = null

    const node = contentMainRef.current
    if (!node) {
      return
    }

    // Measure the layout position without the current transform.
    const currentX = contentColumnX.get()
    if (currentX !== 0) {
      contentColumnX.set(0)
    }
    const nextLeft = node.getBoundingClientRect().left

    if (shouldReduceMotion) {
      contentColumnX.set(0)
      return
    }
    if (!Number.isFinite(nextLeft)) {
      return
    }
    const offset = getContentColumnOffset(previousLeft, nextLeft)
    if (offset === null) {
      contentColumnX.set(0)
      return
    }

    contentColumnAnimateStopRef.current?.()
    startContentColumnTransition({
      motionX: contentColumnX,
      offset,
      transition: immersiveColumnTransition,
      animateTo: (value, target, options) => {
        const playback = animate(value as never, target, options)
        contentColumnAnimateStopRef.current = () => playback.stop()
        return { stop: () => playback.stop() }
      },
      requestFrame: (callback) => {
        const frame = window.requestAnimationFrame((timestamp) => {
          if (contentColumnFrameRef.current === frame) {
            contentColumnFrameRef.current = null
          }
          callback(timestamp)
        })
        contentColumnFrameRef.current = frame
        return frame
      },
    })

    return () => {
      if (contentColumnFrameRef.current !== null) {
        window.cancelAnimationFrame(contentColumnFrameRef.current)
        contentColumnFrameRef.current = null
      }
      contentColumnAnimateStopRef.current?.()
      contentColumnAnimateStopRef.current = null
    }
  }, [contentColumnX, immersiveMode, shouldReduceMotion])

  useEffect(() => {
    if (!shouldReduceMotion) {
      return
    }
    contentColumnX.set(0)
  }, [contentColumnX, shouldReduceMotion])

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }
    const onScroll = () => {
      const scrollTop = main.scrollTop

      if (immersiveMode) {
        if (scrollTop <= 24) {
          setAreImmersiveHeadersHidden(false)
          scrollDirectionRef.current = null
          scrollDirectionStartRef.current = scrollTop
        } else {
          const delta = scrollTop - lastScrollTopRef.current
          const direction = delta > 0 ? 'down' : delta < 0 ? 'up' : null
          if (direction && direction !== scrollDirectionRef.current) {
            scrollDirectionRef.current = direction
            scrollDirectionStartRef.current = lastScrollTopRef.current
          }

          if (direction === 'down' && scrollTop - scrollDirectionStartRef.current >= 12) {
            setAreImmersiveHeadersHidden(true)
          }
          if (direction === 'up' && scrollDirectionStartRef.current - scrollTop >= 8) {
            setAreImmersiveHeadersHidden(false)
          }
        }
      }
      lastScrollTopRef.current = scrollTop

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
  }, [immersiveMode, mainRef])

  useEffect(() => {
    lastScrollTopRef.current = mainRef.current?.scrollTop ?? 0
    scrollDirectionRef.current = null
    scrollDirectionStartRef.current = lastScrollTopRef.current
    if (!immersiveMode) {
      setAreImmersiveHeadersHidden(false)
    }
  }, [immersiveMode, mainRef])

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
    narrower: 'lg:max-w-[800px] xl:max-w-[1000px]',
    narrow: 'lg:max-w-[950px] xl:max-w-[1150px]',
    standard: 'lg:max-w-[1100px] xl:max-w-[1300px]',
    wide: 'lg:max-w-[1250px] xl:max-w-[1450px]',
    wider: 'lg:max-w-[1400px] xl:max-w-[1600px]',
    custom: 'lg:max-w-[var(--xb-content-width)]',
  }
  const contentWidthStyle =
    contentWidth === 'custom'
      ? ({ '--xb-content-width': `${customContentWidth}px` } as CSSProperties)
      : undefined
  const immersiveContentWidth = getContentWidthAdjustedMaxWidth(
    contentWidth,
    720,
    customContentWidth,
  )
  const activeImmersiveColumnWidth = immersiveColumnWidth
    ? `${immersiveColumnWidth}px`
    : immersiveContentWidth
  const chromeTransition = shouldReduceMotion
    ? reducedMotionChromeTransition
    : immersiveChromeTransition
  const railFade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }
  const exitRailFade = shouldReduceMotion
    ? railFade
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      }
  return (
    <ImmersiveHeaderHiddenContext.Provider value={immersiveMode && areImmersiveHeadersHidden}>
      <div
        className="bg-background text-foreground flex h-screen flex-col overflow-y-auto"
        ref={assignShellRef}
      >
        <div
          className={cn(
            'relative mx-auto flex w-full px-3',
            immersiveMode
              ? 'gap-0 [&_[data-shell-rail=left]]:absolute [&_[data-shell-rail=left]]:top-0 [&_[data-shell-rail=left]]:left-0 [&_[data-shell-rail=right]]:absolute [&_[data-shell-rail=right]]:top-0 [&_[data-shell-rail=right]]:right-0'
              : `gap-3 ${contentWidthClass[contentWidth]}`,
          )}
          style={immersiveMode ? undefined : contentWidthStyle}
        >
          <AnimatePresence initial={false}>
            {immersiveMode ? (
              <motion.div
                key="immersive-exit-rail"
                className="fixed top-0 left-0 z-50 h-screen"
                initial={exitRailFade.initial}
                animate={exitRailFade.animate}
                exit={exitRailFade.exit}
                transition={
                  shouldReduceMotion ? chromeTransition : { ...chromeTransition, delay: 0.06 }
                }
                style={immersiveChromeStyle}
              >
                <ImmersiveExitRail onImmersiveModeChange={handleImmersiveModeChange} />
              </motion.div>
            ) : (
              <motion.div
                key="navigation-rail"
                data-shell-rail="left"
                className="sticky top-0 h-screen shrink-0"
                initial={railFade.initial}
                animate={railFade.animate}
                exit={railFade.exit}
                transition={chromeTransition}
                style={immersiveChromeStyle}
              >
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
                  onImmersiveModeChange={handleImmersiveModeChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.main
            ref={contentMainRef}
            className={cn('min-w-0 flex-1 pb-8', immersiveMode && 'mx-auto w-full')}
            style={{
              x: contentColumnX,
              ...(immersiveMode ? { maxWidth: activeImmersiveColumnWidth } : null),
            }}
          >
            {children}
          </motion.main>
          <AnimatePresence initial={false}>
            {!immersiveMode && showRightRail && (
              <motion.div
                key="right-rail"
                data-shell-rail="right"
                className="sticky top-0 h-screen w-[260px] shrink-0"
                initial={railFade.initial}
                animate={railFade.animate}
                exit={railFade.exit}
                transition={chromeTransition}
                style={immersiveChromeStyle}
              >
                <RightRail />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!immersiveMode && <BackToTop scrollRoot={mainScrollRoot} />}
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
