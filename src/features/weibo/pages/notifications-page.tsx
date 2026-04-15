import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationList } from '@/features/weibo/components/notification-list'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import type { NotificationItem } from '@/features/weibo/models/notification'
import type { NotificationTab } from '@/features/weibo/route/page-descriptor'
import { useWeiboPage } from '@/features/weibo/route/use-weibo-page'
import { useAppSettings } from '@/lib/app-settings-store'

const TAB_ROUTES: Record<NotificationTab, string> = {
  mentions: '/at/weibo',
  comments: '/comment/inbox',
  likes: '/like/inbox',
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
}: {
  items: NotificationItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  errorMessage: string | null
  onFetchNextPage: () => void
  onRefetch: () => void
  emptyLabel: string
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onFetchNextPage()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage])

  if (isLoading) {
    return <PageLoadingState label="正在加载..." />
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

export function NotificationsPage() {
  const page = useWeiboPage()
  const navigate = useNavigate()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const activeTab = page.kind === 'notifications' ? page.tab : 'mentions'
  const isEnabled = rewriteEnabled && page.kind === 'notifications'

  const handleTabChange = (tab: string) => {
    navigate(TAB_ROUTES[tab as NotificationTab])
  }

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'notifications', activeTab],
    queryFn: async ({ pageParam }) => {
      if (activeTab === 'mentions') {
        const { loadMentions } = await import('@/features/weibo/services/weibo-repository')
        return loadMentions(pageParam)
      }
      if (activeTab === 'comments') {
        const { loadComments } = await import('@/features/weibo/services/weibo-repository')
        return loadComments(pageParam)
      }
      if (activeTab === 'likes') {
        const { loadLikes } = await import('@/features/weibo/services/weibo-repository')
        return loadLikes(pageParam)
      }
      return { items: [], nextCursor: null }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
    enabled: isEnabled,
  })

  const items = notificationsQuery.data?.pages.flatMap((p) => p.items) ?? []
  const errorMessage =
    notificationsQuery.error instanceof Error ? notificationsQuery.error.message : null

  return (
    <div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col">
        <div className="sticky top-0 z-10 backdrop-blur">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mentions">@我</TabsTrigger>
            <TabsTrigger value="comments">评论</TabsTrigger>
            <TabsTrigger value="likes">赞</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mentions" className="flex flex-col gap-3">
          <NotificationTabContent
            items={items}
            hasNextPage={Boolean(notificationsQuery.hasNextPage)}
            isFetchingNextPage={notificationsQuery.isFetchingNextPage}
            isLoading={notificationsQuery.isLoading}
            errorMessage={errorMessage}
            onFetchNextPage={() => void notificationsQuery.fetchNextPage()}
            onRefetch={() => void notificationsQuery.refetch()}
            emptyLabel="暂无@内容"
          />
        </TabsContent>

        <TabsContent value="comments" className="flex flex-col gap-3">
          <NotificationTabContent
            items={items}
            hasNextPage={Boolean(notificationsQuery.hasNextPage)}
            isFetchingNextPage={notificationsQuery.isFetchingNextPage}
            isLoading={notificationsQuery.isLoading}
            errorMessage={errorMessage}
            onFetchNextPage={() => void notificationsQuery.fetchNextPage()}
            onRefetch={() => void notificationsQuery.refetch()}
            emptyLabel="暂无评论"
          />
        </TabsContent>

        <TabsContent value="likes" className="flex flex-col gap-3">
          <NotificationTabContent
            items={items}
            hasNextPage={Boolean(notificationsQuery.hasNextPage)}
            isFetchingNextPage={notificationsQuery.isFetchingNextPage}
            isLoading={notificationsQuery.isLoading}
            errorMessage={errorMessage}
            onFetchNextPage={() => void notificationsQuery.fetchNextPage()}
            onRefetch={() => void notificationsQuery.refetch()}
            emptyLabel="暂无赞"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
