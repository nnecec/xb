import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { CommentList } from '@/lib/weibo/components/comment-list'
import { FeedCard } from '@/lib/weibo/components/feed-card'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'
import { flattenInfiniteItems } from '@/lib/weibo/queries/weibo-queries'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import { loadStatusComments, loadStatusDetail } from '@/lib/weibo/services/weibo-repository'

export function StatusCommentsSection({
  statusId,
  authorId,
  onCommentReply,
}: {
  statusId: string
  authorId: string
  onCommentReply: ReturnType<typeof useAppShellContext>['setComposeTarget']
}) {
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const commentsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'status-comments', statusId, filter],
    queryFn: ({ pageParam }) => loadStatusComments(statusId, authorId, pageParam, filter),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: statusId !== '' && authorId !== '',
  })

  const comments = flattenInfiniteItems<CommentItem>(commentsQuery.data?.pages)
  const filterGroup = commentsQuery.data?.pages[0]?.filterGroup
  const selectedFilter = filterGroup?.find((item) => item.param === filter) ?? filterGroup?.[0]
  const errorMessage = commentsQuery.error instanceof Error ? commentsQuery.error.message : null

  return (
    <>
      {filterGroup && filterGroup.length > 0 && selectedFilter ? (
        <div className="flex items-center gap-2">
          <Select value={selectedFilter.param} onValueChange={(value) => setFilter(value)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterGroup.map((item) => (
                <SelectItem key={item.param} value={item.param}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await commentsQuery.refetch()
              toast.success('评论刷新成功')
            }}
            disabled={commentsQuery.isFetching}
          >
            <RefreshCw className={`size-3 ${commentsQuery.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      ) : null}

      {commentsQuery.isLoading ? <PageLoadingState label="正在加载评论..." /> : null}
      {!commentsQuery.isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} />
      ) : null}
      {!commentsQuery.isLoading && !errorMessage ? (
        <CommentList
          comments={comments}
          emptyLabel="此微博暂无评论"
          rootStatusId={statusId}
          authorUid={authorId}
          onCommentReply={onCommentReply}
        />
      ) : null}

      {commentsQuery.hasNextPage ? (
        <Button
          variant="outline"
          onClick={() => void commentsQuery.fetchNextPage()}
          disabled={commentsQuery.isFetchingNextPage}
        >
          {commentsQuery.isFetchingNextPage ? '加载中...' : '加载下一页评论'}
        </Button>
      ) : null}
    </>
  )
}

function handleGoBack() {
  if (window.history.length > 2) {
    window.history.back()
  } else {
    window.location.href = 'https://weibo.com'
  }
}

export function StatusDetailPage() {
  const ctx = useAppShellContext()
  const navigate = useNavigate()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  useEffect(() => {
    ctx?.resetMainScroll()
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [ctx?.resetMainScroll])

  const urlStatusId = page.kind === 'status' ? page.statusId : null
  const authorId = page.kind === 'status' ? page.authorId : null
  const isEnabled = rewriteEnabled && page.kind === 'status'

  const detailQuery = useQuery({
    queryKey: ['weibo', 'status', urlStatusId],
    queryFn: () => loadStatusDetail(urlStatusId!),
    enabled: isEnabled && urlStatusId !== null,
  })
  const detail = detailQuery.data

  useEffect(() => {
    if (detail) {
      browsingHistoryStore.getState().addEntry(detail.status)
    }
  }, [detail])

  return (
    <div className="">
      <div className="sticky top-0 z-10 py-2 backdrop-blur">
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleGoBack}>
          <ArrowLeft className="size-4" />
          返回
        </Button>
      </div>
      {detailQuery.isLoading ? <PageLoadingState label="正在加载此微博..." /> : null}
      {detailQuery.error instanceof Error ? (
        <PageErrorState description={detailQuery.error.message} />
      ) : null}
      {detail && ctx ? (
        <div className="flex flex-col gap-4">
          <FeedCard
            item={detail.status}
            surface="detail"
            onNavigate={ctx.navigateToStatusDetail}
            onCommentClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
            }
            onRepostClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))
            }
            onStatusDeleted={() => navigate(-1)}
          />
          {authorId ? (
            <StatusCommentsSection
              statusId={detail.status.id}
              authorId={authorId}
              onCommentReply={ctx.setComposeTarget}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
