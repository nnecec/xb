import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Trash2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'

import { Button } from '@/components/ui/button'
import { CUSTOM_COLUMN_WIDTH_MAX, CUSTOM_COLUMN_WIDTH_MIN } from '@/lib/app-settings'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-context'
import { PageRuntimeProvider, type PageRuntime } from '@/lib/weibo/app/page-runtime'
import { HotSearchCard } from '@/lib/weibo/components/hotsearch-list'
import { SearchCard } from '@/lib/weibo/components/search-card'
import { StatusCardHostProvider, type StatusCardHost } from '@/lib/weibo/components/status-card'
import { SuperTopicCard } from '@/lib/weibo/components/super-topic-card'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { FeedItem, StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import { ExplorePage } from '@/lib/weibo/pages/explore-page'
import { FavoritesPage } from '@/lib/weibo/pages/favorites-page'
import { FollowFansContent } from '@/lib/weibo/pages/follow-fans-page'
import { HistoryPage } from '@/lib/weibo/pages/history-page'
import { HomeTimelinePage } from '@/lib/weibo/pages/home-timeline-page'
import { LikedStatusesPage } from '@/lib/weibo/pages/liked-statuses-page'
import { NotificationsPage } from '@/lib/weibo/pages/notifications-page'
import { ProfileColumnPage } from '@/lib/weibo/pages/profile-page'
import { StatusDetailPage } from '@/lib/weibo/pages/status-detail-page'
import { TopicPage } from '@/lib/weibo/pages/topic-page'
import type { ColumnNavigationLocation } from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'
import {
  ColumnControlsProvider,
  ColumnToolbarDragProvider,
  ColumnToolbarMenuItem,
  ColumnToolbarMenuSeparator,
} from '@/lib/weibo/workspace/column-controls'
import { ColumnPageChromeProvider } from '@/lib/weibo/workspace/column-page-toolbar'
import {
  type AuxiliaryColumn,
  type ColumnSource,
  columnSourceIdentity,
  columnSourceTitle,
  useWorkspace,
} from '@/lib/weibo/workspace/workspace-store'

type ColumnLocation = ColumnNavigationLocation
const EMPTY_LOCATION_STACK: ColumnLocation[] = []

function sourcePage(source: ColumnSource): ColumnLocation | null {
  switch (source.kind) {
    case 'home':
      return {
        kind: 'home' as const,
        tab: source.tab,
        ...(source.groupId ? { groupId: source.groupId } : {}),
      }
    case 'explore':
      return { kind: 'explore' as const, groupId: source.groupId ?? '102803' }
    case 'saved':
      return source.tab === 'liked'
        ? { kind: 'liked' as const, uid: source.uid }
        : { kind: 'favorites' as const, uid: source.uid }
    case 'favorites':
      return { kind: 'favorites' as const, uid: source.uid }
    case 'liked':
      return { kind: 'liked' as const, uid: source.uid }
    case 'notifications':
      return { kind: 'notifications' as const, tab: source.tab ?? 'mentions' }
    case 'topic':
      return { kind: 'topic' as const, topic: source.topic }
    case 'follow':
      return { kind: 'follow' as const, uid: source.uid, tab: source.tab }
    case 'profile':
      return {
        kind: 'profile' as const,
        profileId: source.profileId,
        profileSource: source.profileSource,
        tab: 'posts' as const,
      }
    case 'history':
      return { kind: 'history' as const }
    case 'hot-search':
      return null
    case 'followed-super-topics':
    case 'search-entry':
      return null
    default:
      return null
  }
}

function columnLocationFromTarget(to: string): ColumnLocation | null {
  const url = new URL(to, window.location.origin)
  const page = parseWeiboUrl(url.href)
  if (page.kind === 'unsupported') return null
  if (page.kind === 'follow') {
    return { ...page, tab: url.searchParams.get('tab') === 'fans' ? 'fans' : 'following' }
  }
  return page
}

function sameColumnLocation(left: ColumnLocation, right: ColumnLocation): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function shouldReplaceSectionLocation(left: ColumnLocation | null, right: ColumnLocation): boolean {
  if (!left) return false
  const sectionKinds = new Set(['home', 'explore', 'notifications', 'favorites', 'liked'])
  return sectionKinds.has(left.kind) && sectionKinds.has(right.kind)
}

function ColumnLocationPage({
  location,
  onLocationChange,
  onSavedListChange,
}: {
  location: ColumnLocation
  onLocationChange: (location: ColumnLocation) => void
  onSavedListChange?: (value: 'favorites' | 'liked') => void
}) {
  switch (location.kind) {
    case 'home':
      return (
        <HomeTimelinePage
          source={location}
          onSourceChange={(source) => onLocationChange({ kind: 'home', ...source })}
        />
      )
    case 'explore':
      return (
        <ExplorePage
          source={location}
          onSourceChange={(source) => onLocationChange({ kind: 'explore', ...source })}
        />
      )
    case 'favorites':
      return <FavoritesPage source={{ uid: location.uid }} onSavedListChange={onSavedListChange} />
    case 'liked':
      return (
        <LikedStatusesPage source={{ uid: location.uid }} onSavedListChange={onSavedListChange} />
      )
    case 'notifications':
      return <NotificationsPage source={{ tab: location.tab }} />
    case 'topic':
      return <TopicPage source={location} />
    case 'follow':
      return (
        <FollowFansContent
          uid={location.uid}
          tab={location.tab}
          showTabs
          onTabChange={(tab) => {
            if (tab === location.tab) return
            onLocationChange({ kind: 'follow', uid: location.uid, tab })
          }}
        />
      )
    case 'profile':
      return (
        <ProfileColumnPage
          source={{
            profileId: location.profileId,
            profileSource: location.profileSource,
          }}
        />
      )
    case 'history':
      return <HistoryPage />
    case 'status':
      return <StatusDetailPage />
  }
}

export function AuxiliaryColumnView({
  column,
  columnWidthPx,
  onRemove,
  onMove,
  onWidthChange,
  index,
  columnCount,
  sortingDisabled,
  shouldReduceMotion,
}: {
  column: AuxiliaryColumn
  columnWidthPx: number
  onRemove: (id: string) => void
  onMove: (id: string, targetIndex: number) => void
  onWidthChange?: (id: string, width: number) => Promise<void>
  index: number
  columnCount: number
  sortingDisabled: boolean
  shouldReduceMotion: boolean
}) {
  const [isResizing, setIsResizing] = useState(false)
  const { isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } =
    useSortable({
      id: column.id,
      disabled: sortingDisabled || isResizing,
      transition: shouldReduceMotion
        ? null
        : { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    })
  const { setComposeTarget } = useAppShellContext()
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const savedScrollByDepthRef = useRef<number[]>([])
  const savedFocusByDepthRef = useRef<Array<HTMLElement | null>>([])
  const sourceIdentity = columnSourceIdentity(column.source)
  const setColumnLastLocation = useWorkspace((state) => state.setColumnLastLocation)
  const initialBaseLocation = column.lastBaseLocation ?? sourcePage(column.source)
  const initialStack = useMemo(
    () =>
      column.lastLocation &&
      (!initialBaseLocation || !sameColumnLocation(column.lastLocation, initialBaseLocation))
        ? [column.lastLocation]
        : [],
    [column.lastLocation, initialBaseLocation],
  )
  const [navigation, setNavigation] = useState<{
    sourceIdentity: string
    base: ColumnLocation | null
    stack: ColumnLocation[]
  }>({ sourceIdentity, base: initialBaseLocation, stack: initialStack })
  const activeNavigation = navigation.sourceIdentity === sourceIdentity ? navigation : null
  const locationStack = activeNavigation?.stack ?? EMPTY_LOCATION_STACK
  const baseLocation = activeNavigation?.base ?? null
  const location = locationStack.at(-1) ?? null
  const navigatedPage = location ?? baseLocation
  const page = navigatedPage ?? sourcePage(column.source)
  const [hotSearchType] = useState(
    column.source.kind === 'hot-search' ? (column.source.type ?? 'hot') : 'hot',
  )
  const rememberScroll = useCallback((depth: number) => {
    const rootNode = scrollRootRef.current?.getRootNode()
    savedScrollByDepthRef.current[depth] = scrollRootRef.current?.scrollTop ?? 0
    savedFocusByDepthRef.current[depth] =
      rootNode instanceof ShadowRoot
        ? (rootNode.activeElement as HTMLElement | null)
        : (document.activeElement as HTMLElement | null)
  }, [])
  const showLocation = useCallback(
    (nextLocation: ColumnLocation, mode: 'push' | 'replace') => {
      const visible = locationStack.at(-1) ?? baseLocation ?? sourcePage(column.source)
      if (visible && sameColumnLocation(visible, nextLocation)) return
      const effectiveMode = shouldReplaceSectionLocation(visible, nextLocation) ? 'replace' : mode
      const replacesTop = effectiveMode === 'replace' && locationStack.length > 0
      if (!replacesTop && effectiveMode === 'push') rememberScroll(locationStack.length)
      setNavigation((current) => {
        const currentNavigation =
          current.sourceIdentity === sourceIdentity
            ? current
            : { sourceIdentity, base: initialBaseLocation, stack: initialStack }
        const currentVisible =
          currentNavigation.stack.at(-1) ?? currentNavigation.base ?? sourcePage(column.source)
        if (currentVisible && sameColumnLocation(currentVisible, nextLocation)) return current
        if (effectiveMode === 'replace') {
          return { sourceIdentity, base: nextLocation, stack: [] }
        }
        return {
          sourceIdentity,
          base: currentNavigation.base,
          stack: [...currentNavigation.stack, nextLocation],
        }
      })
      const nextBaseLocation =
        effectiveMode === 'replace'
          ? nextLocation
          : (baseLocation ?? initialBaseLocation ?? sourcePage(column.source))
      void setColumnLastLocation(column.id, nextLocation, nextBaseLocation).catch(() => {})
      requestAnimationFrame(() => {
        if (scrollRootRef.current) scrollRootRef.current.scrollTop = 0
      })
    },
    [
      baseLocation,
      column.id,
      column.source,
      initialBaseLocation,
      initialStack,
      locationStack,
      rememberScroll,
      setColumnLastLocation,
      sourceIdentity,
    ],
  )
  const openStatus = useCallback(
    (item: StatusDetailNavigationItem) => {
      const statusId = item.mblogId ?? item.id
      if (!item.author.id || !statusId) return
      showLocation({ kind: 'status', authorId: item.author.id, statusId }, 'push')
    },
    [showLocation],
  )
  const back = useCallback(() => {
    if (locationStack.length === 0) return
    const nextDepth = locationStack.length - 1
    const currentStack = locationStack
    const nextLocation = currentStack.at(-2) ?? baseLocation ?? sourcePage(column.source)
    setNavigation((current) => {
      const stack = current.sourceIdentity === sourceIdentity ? current.stack : []
      if (stack.length === 0) return current
      return {
        sourceIdentity,
        base: current.sourceIdentity === sourceIdentity ? current.base : initialBaseLocation,
        stack: stack.slice(0, -1),
      }
    })
    void setColumnLastLocation(column.id, nextLocation, baseLocation ?? initialBaseLocation).catch(
      () => {},
    )
    requestAnimationFrame(() => {
      if (scrollRootRef.current) {
        scrollRootRef.current.scrollTop = savedScrollByDepthRef.current[nextDepth] ?? 0
      }
      savedFocusByDepthRef.current[nextDepth]?.focus()
    })
  }, [
    baseLocation,
    column.id,
    column.source,
    initialBaseLocation,
    locationStack,
    setColumnLastLocation,
    sourceIdentity,
  ])
  const runtime = useMemo<PageRuntime>(
    () => ({
      page: page ?? { kind: 'unsupported', reason: 'unmatched-path' },
      navigationMode: 'column',
      canGoBack: locationStack.length > 0,
      scrollRootRef,
      navigate: (to, options) => {
        const nextLocation = columnLocationFromTarget(to)
        if (!nextLocation) return
        showLocation(nextLocation, options?.replace ? 'replace' : 'push')
      },
      openStatus,
      back,
      resetScroll: () => {
        if (scrollRootRef.current) scrollRootRef.current.scrollTop = 0
      },
      scrollToTop: () => scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
    }),
    [back, locationStack.length, openStatus, page, showLocation],
  )
  const host = useMemo<StatusCardHost>(
    () => ({
      openStatus,
      composeStatus: (status: FeedItem, mode: 'comment' | 'repost') => {
        setComposeTarget(composeTargetFromFeedItem(status, mode))
      },
    }),
    [openStatus, setComposeTarget],
  )
  const keepNavigationInsideColumn = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.download)
      return
    const href = anchor.getAttribute('href')
    if (!href) return
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    event.stopPropagation()
    runtime.navigate(`${url.pathname}${url.search}`)
  }
  const [columnWidth, setColumnWidth] = useState(column.width ?? columnWidthPx)
  const columnWidthRef = useRef(columnWidth)
  const resizeStartRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(
    null,
  )
  const resizePreviousWidthRef = useRef(columnWidth)
  const resizeRequestIdRef = useRef(0)

  useEffect(() => {
    if (resizeStartRef.current) return
    const nextWidth = column.width ?? columnWidthPx
    columnWidthRef.current = nextWidth
    setColumnWidth(nextWidth)
  }, [column.width, columnWidthPx])

  const clampColumnWidth = (width: number) =>
    Math.round(Math.min(CUSTOM_COLUMN_WIDTH_MAX, Math.max(CUSTOM_COLUMN_WIDTH_MIN, width)))
  const finishResize = useCallback(async () => {
    const resize = resizeStartRef.current
    if (!resize) return
    resizeStartRef.current = null
    setIsResizing(false)
    const nextWidth = clampColumnWidth(columnWidthRef.current)
    const requestId = ++resizeRequestIdRef.current
    try {
      await onWidthChange?.(column.id, nextWidth)
    } catch {
      if (requestId !== resizeRequestIdRef.current) return
      columnWidthRef.current = resizePreviousWidthRef.current
      setColumnWidth(resizePreviousWidthRef.current)
    }
  }, [column.id, onWidthChange])

  useEffect(() => {
    if (!isResizing) return
    const finishOnWindowBlur = () => void finishResize()
    window.addEventListener('blur', finishOnWindowBlur)
    return () => window.removeEventListener('blur', finishOnWindowBlur)
  }, [finishResize, isResizing])
  const handleResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return
    event.preventDefault()
    event.stopPropagation()
    resizeStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: columnWidth,
    }
    resizePreviousWidthRef.current = columnWidth
    setIsResizing(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const handleResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeStartRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const nextWidth = clampColumnWidth(resize.startWidth + event.clientX - resize.startX)
    columnWidthRef.current = nextWidth
    setColumnWidth(nextWidth)
  }
  const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return
    event.preventDefault()
    const previousWidth = columnWidthRef.current
    const nextWidth =
      event.key === 'Home'
        ? CUSTOM_COLUMN_WIDTH_MIN
        : event.key === 'End'
          ? CUSTOM_COLUMN_WIDTH_MAX
          : clampColumnWidth(previousWidth + (event.key === 'ArrowRight' ? 10 : -10))
    columnWidthRef.current = nextWidth
    setColumnWidth(nextWidth)
    const requestId = ++resizeRequestIdRef.current
    void (onWidthChange?.(column.id, nextWidth) ?? Promise.resolve()).catch(() => {
      if (requestId !== resizeRequestIdRef.current) return
      columnWidthRef.current = previousWidth
      setColumnWidth(previousWidth)
    })
  }

  const sortableStyle: CSSProperties = {
    width: columnWidth,
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition,
    opacity: isDragging ? 0.35 : undefined,
  }
  const savedUid =
    column.source.kind === 'saved' ||
    column.source.kind === 'favorites' ||
    column.source.kind === 'liked'
      ? column.source.uid
      : null
  const changeSavedList = useCallback(
    (value: 'favorites' | 'liked') => {
      if (!savedUid) return
      runtime.navigate(value === 'liked' ? `/u/page/like/${savedUid}` : `/u/page/fav/${savedUid}`, {
        replace: true,
      })
    },
    [runtime, savedUid],
  )
  const canGoBack = locationStack.length > 0
  const columnMenu = (
    <>
      <ColumnToolbarMenuItem disabled={index === 0} onSelect={() => onMove(column.id, index - 1)}>
        <ArrowLeft />
        向左移
      </ColumnToolbarMenuItem>
      <ColumnToolbarMenuItem
        disabled={index === columnCount - 1}
        onSelect={() => onMove(column.id, index + 1)}
      >
        <ArrowRight />
        向右移
      </ColumnToolbarMenuItem>
      <ColumnToolbarMenuItem disabled={index === 0} onSelect={() => onMove(column.id, 0)}>
        <ChevronsLeft />
        移动到最左边
      </ColumnToolbarMenuItem>
      <ColumnToolbarMenuItem
        disabled={index === columnCount - 1}
        onSelect={() => onMove(column.id, columnCount - 1)}
      >
        <ChevronsRight />
        移动到最右边
      </ColumnToolbarMenuItem>
      <ColumnToolbarMenuSeparator className="bg-border -mx-1 my-1 h-px" />
      <ColumnToolbarMenuItem
        className="text-destructive focus:text-destructive"
        onSelect={() => onRemove(column.id)}
      >
        <Trash2 />
        删除列
      </ColumnToolbarMenuItem>
    </>
  )

  return (
    <section
      ref={setNodeRef}
      data-auxiliary-column={column.id}
      className="bg-background relative flex h-full shrink-0 flex-col overflow-hidden border-x"
      style={sortableStyle}
    >
      <button
        type="button"
        role="separator"
        aria-orientation="vertical"
        aria-label={`调整${columnSourceTitle(column.source)}列宽`}
        aria-valuemin={CUSTOM_COLUMN_WIDTH_MIN}
        aria-valuemax={CUSTOM_COLUMN_WIDTH_MAX}
        aria-valuenow={columnWidth}
        data-column-control
        className="focus-visible:ring-ring hover:after:bg-primary/20 focus-visible:after:bg-primary/20 absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none after:absolute after:inset-y-0 after:right-[3px] after:w-px after:transition-colors after:duration-150 after:content-[''] focus-visible:ring-2 focus-visible:ring-inset"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={() => void finishResize()}
        onPointerCancel={() => void finishResize()}
        onLostPointerCapture={() => void finishResize()}
        onKeyDown={handleResizeKeyDown}
      />
      <div
        ref={scrollRootRef}
        className="xb-column-scroll min-h-0 flex-1 overflow-y-auto"
        onClickCapture={keepNavigationInsideColumn}
      >
        <ColumnPageChromeProvider active>
          <PageRuntimeProvider runtime={runtime}>
            <ColumnToolbarDragProvider
              listeners={sortingDisabled ? undefined : listeners}
              setActivatorNodeRef={setActivatorNodeRef}
              menu={columnMenu}
            >
              <ColumnControlsProvider
                controls={
                  canGoBack ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="返回"
                      data-column-control
                      className="shrink-0"
                      onClick={back}
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                  ) : null
                }
              >
                <StatusCardHostProvider host={host}>
                  {navigatedPage ? (
                    <ColumnLocationPage
                      location={navigatedPage}
                      onLocationChange={(nextLocation) => showLocation(nextLocation, 'replace')}
                      onSavedListChange={
                        savedUid
                          ? (value) => {
                              showLocation(
                                value === 'liked'
                                  ? { kind: 'liked', uid: savedUid }
                                  : { kind: 'favorites', uid: savedUid },
                                'replace',
                              )
                            }
                          : undefined
                      }
                    />
                  ) : column.source.kind === 'saved' ? (
                    column.source.tab === 'liked' ? (
                      <LikedStatusesPage onSavedListChange={changeSavedList} />
                    ) : (
                      <FavoritesPage onSavedListChange={changeSavedList} />
                    )
                  ) : column.source.kind === 'home' ? (
                    <HomeTimelinePage
                      source={column.source}
                      onSourceChange={(source) =>
                        showLocation({ kind: 'home', ...source }, 'replace')
                      }
                    />
                  ) : column.source.kind === 'explore' ? (
                    <ExplorePage
                      source={{ groupId: column.source.groupId ?? '102803' }}
                      onSourceChange={(source) =>
                        showLocation({ kind: 'explore', ...source }, 'replace')
                      }
                    />
                  ) : column.source.kind === 'favorites' ? (
                    <FavoritesPage onSavedListChange={changeSavedList} />
                  ) : column.source.kind === 'liked' ? (
                    <LikedStatusesPage onSavedListChange={changeSavedList} />
                  ) : column.source.kind === 'notifications' ? (
                    <NotificationsPage />
                  ) : column.source.kind === 'topic' ? (
                    <TopicPage source={column.source} />
                  ) : column.source.kind === 'follow' ? (
                    <FollowFansContent
                      uid={column.source.uid}
                      tab={column.source.tab}
                      showTabs
                      onTabChange={(tab) => {
                        if (column.source.kind !== 'follow' || tab === column.source.tab) return
                        runtime.navigate(`/u/page/follow/${column.source.uid}?tab=${tab}`)
                      }}
                    />
                  ) : column.source.kind === 'profile' ? (
                    <ProfileColumnPage source={column.source} />
                  ) : column.source.kind === 'history' ? (
                    <HistoryPage />
                  ) : column.source.kind === 'hot-search' ? (
                    <>
                      <TimelineTopBar
                        title={columnSourceTitle({ kind: 'hot-search', type: hotSearchType })}
                      />
                      <HotSearchCard
                        type={hotSearchType}
                        showTypeSelector={false}
                        variant="column"
                      />
                    </>
                  ) : column.source.kind === 'followed-super-topics' ? (
                    <>
                      <TimelineTopBar title={columnSourceTitle(column.source)} />
                      <SuperTopicCard variant="column" />
                    </>
                  ) : column.source.kind === 'search-entry' ? (
                    <>
                      <TimelineTopBar title="搜索" />
                      <SearchCard className="pt-4" />
                    </>
                  ) : (
                    <>
                      <TimelineTopBar title={columnSourceTitle(column.source)} />
                      <div className="text-muted-foreground flex min-h-40 items-center justify-center px-4 text-sm">
                        此列类型正在接入中
                      </div>
                    </>
                  )}
                </StatusCardHostProvider>
              </ColumnControlsProvider>
            </ColumnToolbarDragProvider>
          </PageRuntimeProvider>
        </ColumnPageChromeProvider>
      </div>
    </section>
  )
}
