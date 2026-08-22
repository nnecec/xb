import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, type RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { NotificationList } from '@/lib/weibo/components/notification-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { TimelineTopBar, type TimelineTopBarOption } from '@/lib/weibo/components/timeline-top-bar'
import { NOTIFICATION_INFINITE_QUERY_MAX_PAGES } from '@/lib/weibo/data/weibo-data'
import type { NotificationItem } from '@/lib/weibo/models/notification'
import type { NotificationTab } from '@/lib/weibo/route/page-descriptor'

const NOTIFICATION_OPTIONS: TimelineTopBarOption[] = [
  { value: 'mentions', label: '@我' },
  { value: 'comments', label: '评论' },
  { value: 'likes', label: '赞' },
]

const TAB_ROUTES: Record<NotificationTab, string> = {
  mentions: '/at/weibo',
  comments: '/comment/inbox',
  likes: '/like/inbox',
}

function resetMainScrollAfterRouteChange(resetMainScroll: () => void) {
  requestAnimationFrame(resetMainScroll)
}

function NotificationTabContent({
  items,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  errorMessage,
  onFetchNextPage,
  onRefetch,
  emptyLabel,
  scrollRootRef,
}: {
  items: NotificationItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  errorMessage: string | null
  onFetchNextPage: () => void
  onRefetch: () => void
  emptyLabel: string
  scrollRootRef: RefObject<HTMLElement | null>
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const onFetchNextPageRef = useRef(onFetchNextPage)
  onFetchNextPageRef.current = onFetchNextPage
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  isFetchingNextPageRef.current = isFetchingNextPage

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPageRef.current) {
          onFetchNextPageRef.current()
        }
      },
      { root: scrollRootRef.current, threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, scrollRootRef])

  if (isLoading) {
    return <PageLoadingState label="正在加载…" />
  }

  if (errorMessage) {
    return <PageErrorState description={errorMessage} onRetry={onRefetch} />
  }

  return (
    <>
      <NotificationList items={items} emptyLabel={emptyLabel} />
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-3">
          {isFetchingNextPage ? <Spinner size="sm" /> : null}
        </div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <Button variant="outline" onClick={onFetchNextPage}>
          加载下一页
        </Button>
      )}
    </>
  )
}

export function NotificationsPage({ source }: { source?: { tab: NotificationTab } } = {}) {
  const runtime = usePageRuntime()
  const page = runtime.page
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const activeTab = source?.tab ?? (page.kind === 'notifications' ? page.tab : 'mentions')
  const isEnabled = rewriteEnabled && (source !== undefined || page.kind === 'notifications')

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return
    runtime.navigate(TAB_ROUTES[tab as NotificationTab])
    resetMainScrollAfterRouteChange(runtime.resetScroll)
  }

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'notifications', activeTab],
    queryFn: async ({ pageParam }) => {
      if (activeTab === 'mentions') {
        const { loadMentions } = await import('@/lib/weibo/data/weibo-data')
        return loadMentions(pageParam)
      }
      if (activeTab === 'comments') {
        const { loadComments } = await import('@/lib/weibo/data/weibo-data')
        return loadComments(pageParam)
      }
      if (activeTab === 'likes') {
        const { loadLikes } = await import('@/lib/weibo/data/weibo-data')
        return loadLikes(pageParam)
      }
      return { items: [], nextCursor: null }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    maxPages: NOTIFICATION_INFINITE_QUERY_MAX_PAGES,
    staleTime: 30 * 60 * 1000,
    enabled: isEnabled,
  })

  const isRefreshing = notificationsQuery.isFetching && !notificationsQuery.isFetchingNextPage

  const wasRefreshingRef = useRef(false)
  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing) {
      runtime.scrollToTop()
    }
    wasRefreshingRef.current = isRefreshing
  }, [isRefreshing, runtime])

  const items = useMemo(
    () => notificationsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [notificationsQuery.data?.pages],
  )
  const errorMessage =
    notificationsQuery.error instanceof Error ? notificationsQuery.error.message : null
  const activeTitle =
    NOTIFICATION_OPTIONS.find((option) => option.value === activeTab)?.label ?? '@我'

  return (
    <div className="flex flex-col">
      <TimelineTopBar
        title={activeTitle}
        titleOptions={source ? undefined : NOTIFICATION_OPTIONS}
        titleValue={source ? undefined : activeTab}
        onTitleChange={source ? undefined : handleTabChange}
        onRefresh={() => void notificationsQuery.refetch()}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-col gap-3">
        <NotificationTabContent
          items={items}
          hasNextPage={Boolean(notificationsQuery.hasNextPage)}
          isFetchingNextPage={notificationsQuery.isFetchingNextPage}
          isLoading={notificationsQuery.isLoading}
          errorMessage={errorMessage}
          onFetchNextPage={() => void notificationsQuery.fetchNextPage()}
          onRefetch={() => void notificationsQuery.refetch()}
          scrollRootRef={runtime.scrollRootRef}
          emptyLabel={
            activeTab === 'mentions'
              ? '暂无@内容'
              : activeTab === 'comments'
                ? '暂无评论'
                : '暂无赞'
          }
        />
      </div>
    </div>
  )
}
