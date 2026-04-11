import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { CommentList } from '@/features/weibo/components/comment-list'
import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { CommentItem, StatusDetail } from '@/features/weibo/models/status'
import { flattenInfiniteItems } from '@/features/weibo/queries/weibo-queries'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { loadStatusComments, loadStatusDetail } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

function createStatusComposeTarget({
  detail,
  mode,
}: {
  detail: StatusDetail
  mode: 'comment' | 'repost'
}): ComposeTarget {
  return {
    kind: 'status',
    mode,
    statusId: detail.status.id,
    targetCommentId: null,
    authorName: detail.status.author.name,
    excerpt: detail.status.text.trim().slice(0, 80),
  }
}

export function StatusDetailPage() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const [filterParam, setFilterParam] = useState<string | undefined>(undefined)

  const page = useMemo(
    () =>
      parseWeiboUrl(new URL(`${location.pathname}${location.search}`, window.location.origin).href),
    [location.pathname, location.search],
  )

  const urlStatusId = page.kind === 'status' ? page.statusId : null
  const authorId = page.kind === 'status' ? page.authorId : null
  const isEnabled = rewriteEnabled && page.kind === 'status'

  const statusDetailQuery = useQuery({
    queryKey: ['weibo', 'status', urlStatusId],
    queryFn: () => loadStatusDetail(urlStatusId!),
    enabled: isEnabled && urlStatusId !== null,
  })

  const commentsStatusId = statusDetailQuery.data?.status.id ?? null

  const statusCommentsQuery = useInfiniteQuery({
    queryKey: ['weibo', 'status-comments', commentsStatusId, filterParam],
    queryFn: ({ pageParam }) =>
      loadStatusComments(commentsStatusId!, authorId!, pageParam, filterParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled && commentsStatusId !== null && authorId !== null,
  })

  const comments = flattenInfiniteItems<CommentItem>(statusCommentsQuery.data?.pages)
  const filterGroup = statusCommentsQuery.data?.pages[0]?.filterGroup

  const detail = statusDetailQuery.data
  const selectedFilter = filterGroup?.find((f) => f.param === filterParam) ?? filterGroup?.[0]

  return (
    <div className="relative mx-auto h-full">
      {statusDetailQuery.isLoading ? <PageLoadingState label="正在加载此微博..." /> : null}
      {statusDetailQuery.error instanceof Error ? (
        <PageErrorState description={statusDetailQuery.error.message} />
      ) : null}
      {detail ? (
        <div className="flex flex-col gap-4">
          <FeedCard
            item={detail.status}
            onNavigate={ctx.navigateToStatusDetail}
            onCommentClick={() =>
              ctx.setComposeTarget(createStatusComposeTarget({ detail, mode: 'comment' }))
            }
            onRepostClick={() =>
              ctx.setComposeTarget(createStatusComposeTarget({ detail, mode: 'repost' }))
            }
          />
          {filterGroup && filterGroup.length > 0 && selectedFilter && (
            <Select value={selectedFilter.param} onValueChange={(value) => setFilterParam(value)}>
              <SelectTrigger size="sm" className="min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterGroup.map((filter) => (
                  <SelectItem key={filter.param} value={filter.param}>
                    {filter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <CommentList
            comments={comments}
            emptyLabel="此微博暂无评论"
            rootStatusId={detail.status.id}
            onCommentReply={ctx.setComposeTarget}
            onNavigate={ctx.navigateToStatusDetail}
          />
          {statusCommentsQuery.hasNextPage ? (
            <Button
              variant="outline"
              onClick={() => void statusCommentsQuery.fetchNextPage()}
              disabled={statusCommentsQuery.isFetchingNextPage}
            >
              {statusCommentsQuery.isFetchingNextPage ? '加载中...' : '加载下一页评论'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
