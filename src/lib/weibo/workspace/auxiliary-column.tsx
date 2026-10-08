import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'
import { ColumnControlsProvider } from '@/lib/weibo/workspace/column-controls'
import {
  type AuxiliaryColumn,
  type ColumnSource,
  columnSourceTitle,
} from '@/lib/weibo/workspace/workspace-store'

function sourcePage(source: ColumnSource) {
  switch (source.kind) {
    case 'home':
      return {
        kind: 'home' as const,
        tab: source.tab,
        ...(source.groupId ? { groupId: source.groupId } : {}),
      }
    case 'explore':
      return { kind: 'explore' as const, groupId: source.groupId }
    case 'favorites':
      return { kind: 'favorites' as const, uid: source.uid }
    case 'liked':
      return { kind: 'liked' as const, uid: source.uid }
    case 'notifications':
      return { kind: 'notifications' as const, tab: source.tab }
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

export function AuxiliaryColumnView({
  column,
  columnWidthPx,
  onRemove,
  onMove,
  index,
  columnCount,
  sortingDisabled,
  shouldReduceMotion,
}: {
  column: AuxiliaryColumn
  columnWidthPx: number
  onRemove: (id: string) => void
  onMove: (id: string, targetIndex: number) => void
  index: number
  columnCount: number
  sortingDisabled: boolean
  shouldReduceMotion: boolean
}) {
  const { isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } =
    useSortable({
      id: column.id,
      disabled: sortingDisabled,
      transition: shouldReduceMotion
        ? null
        : { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    })
  const { setComposeTarget } = useAppShellContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const savedScrollByDepthRef = useRef<number[]>([])
  const savedFocusByDepthRef = useRef<Array<HTMLElement | null>>([])
  const [detailStack, setDetailStack] = useState<StatusDetailNavigationItem[]>([])
  const detail = detailStack.at(-1) ?? null
  const page = useMemo(
    () =>
      detail
        ? {
            kind: 'status' as const,
            authorId: detail.author.id,
            statusId: detail.mblogId ?? detail.id,
          }
        : sourcePage(column.source),
    [column.source, detail],
  )
  const pushDetail = useCallback(
    (item: StatusDetailNavigationItem) => {
      const depth = detailStack.length
      const rootNode = scrollRootRef.current?.getRootNode()
      savedScrollByDepthRef.current[depth] = scrollRootRef.current?.scrollTop ?? 0
      savedFocusByDepthRef.current[depth] =
        rootNode instanceof ShadowRoot
          ? (rootNode.activeElement as HTMLElement | null)
          : (document.activeElement as HTMLElement | null)
      setDetailStack((current) => [...current, item])
      requestAnimationFrame(() => {
        if (scrollRootRef.current) scrollRootRef.current.scrollTop = 0
      })
    },
    [detailStack.length],
  )
  const back = useCallback(() => {
    if (detailStack.length === 0) return
    const nextDepth = detailStack.length - 1
    setDetailStack((current) => current.slice(0, -1))
    requestAnimationFrame(() => {
      if (scrollRootRef.current) {
        scrollRootRef.current.scrollTop = savedScrollByDepthRef.current[nextDepth] ?? 0
      }
      savedFocusByDepthRef.current[nextDepth]?.focus()
    })
  }, [detailStack.length])
  const runtime = useMemo<PageRuntime>(
    () => ({
      page: page ?? { kind: 'unsupported', reason: 'unmatched-path' },
      navigationMode: 'column',
      scrollRootRef,
      navigate: (to) => {
        const targetPage = parseWeiboUrl(new URL(to, window.location.origin).href)
        if (targetPage.kind === 'status') {
          pushDetail({
            id: targetPage.statusId,
            mblogId: targetPage.statusId,
            author: { id: targetPage.authorId, name: '', avatarUrl: null },
          })
          return
        }
        toast.info('辅助列只支持在列内打开微博详情')
      },
      openStatus: pushDetail,
      back,
      resetScroll: () => {
        if (scrollRootRef.current) scrollRootRef.current.scrollTop = 0
      },
      scrollToTop: () => scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
    }),
    [back, page, pushDetail],
  )
  const host = useMemo<StatusCardHost>(
    () => ({
      openStatus: pushDetail,
      composeStatus: (status: FeedItem, mode: 'comment' | 'repost') => {
        setComposeTarget(composeTargetFromFeedItem(status, mode))
      },
    }),
    [pushDetail, setComposeTarget],
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
  const sortableStyle: CSSProperties = {
    width: columnWidthPx,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }
  const title = columnSourceTitle(column.source)

  if (isDragging && menuOpen) setMenuOpen(false)

  const columnControls = (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        asChild
        onPointerDown={(event) => {
          event.currentTarget.focus()
          event.preventDefault()
        }}
      >
        <Button
          ref={setActivatorNodeRef}
          data-column-control
          type="button"
          variant="ghost"
          size="icon"
          static
          aria-label={`${title}列操作`}
          className="cursor-grab touch-none active:cursor-grabbing"
          disabled={sortingDisabled}
          onClick={(event) => {
            if (event.detail !== 0) setMenuOpen((open) => !open)
          }}
          {...listeners}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(column.id, index - 1)}>
            <ArrowLeft />
            向左移
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === columnCount - 1}
            onSelect={() => onMove(column.id, index + 1)}
          >
            <ArrowRight />
            向右移
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(column.id, 0)}>
            <ChevronsLeft />
            移动到最左边
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === columnCount - 1}
            onSelect={() => onMove(column.id, columnCount - 1)}
          >
            <ChevronsRight />
            移动到最右边
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onSelect={() => onRemove(column.id)}>
            <Trash2 />
            删除列
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <section
      ref={setNodeRef}
      data-auxiliary-column={column.id}
      className="bg-background flex h-full shrink-0 flex-col overflow-hidden border-x"
      style={sortableStyle}
    >
      <div
        ref={scrollRootRef}
        className="xb-column-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4"
        onClickCapture={keepNavigationInsideColumn}
      >
        <ColumnControlsProvider controls={columnControls}>
          <PageRuntimeProvider runtime={runtime}>
            <StatusCardHostProvider host={host}>
              {detail ? (
                <StatusDetailPage />
              ) : column.source.kind === 'home' ? (
                <HomeTimelinePage source={column.source} />
              ) : column.source.kind === 'explore' ? (
                <ExplorePage source={column.source} />
              ) : column.source.kind === 'favorites' ? (
                <FavoritesPage source={column.source} />
              ) : column.source.kind === 'liked' ? (
                <LikedStatusesPage source={column.source} />
              ) : column.source.kind === 'notifications' ? (
                <NotificationsPage source={column.source} />
              ) : column.source.kind === 'topic' ? (
                <TopicPage source={column.source} />
              ) : column.source.kind === 'follow' ? (
                <FollowFansContent uid={column.source.uid} tab={column.source.tab} />
              ) : column.source.kind === 'profile' ? (
                <ProfileColumnPage source={column.source} />
              ) : column.source.kind === 'history' ? (
                <HistoryPage
                  onOpenEntry={(entry) => {
                    if (!entry.statusId) return
                    runtime.openStatus({
                      id: entry.id,
                      mblogId: entry.statusId,
                      author: {
                        id: entry.authorId,
                        name: entry.authorName,
                        avatarUrl: entry.authorAvatar,
                      },
                    })
                  }}
                />
              ) : column.source.kind === 'hot-search' ? (
                <HotSearchCard
                  type={column.source.type}
                  showTypeSelector={false}
                  variant="column"
                />
              ) : column.source.kind === 'followed-super-topics' ? (
                <SuperTopicCard variant="column" />
              ) : column.source.kind === 'search-entry' ? (
                <>
                  <TimelineTopBar title="搜索" />
                  <SearchCard className="pt-4" />
                </>
              ) : (
                <div className="text-muted-foreground flex min-h-40 items-center justify-center px-4 text-sm">
                  此列类型正在接入中
                </div>
              )}
            </StatusCardHostProvider>
          </PageRuntimeProvider>
        </ColumnControlsProvider>
      </div>
    </section>
  )
}
