import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'

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
import { composeTargetFromFeedItem } from '@/features/weibo/models/compose'
import type { CommentItem } from '@/features/weibo/models/status'
import { flattenInfiniteItems } from '@/features/weibo/queries/weibo-queries'
import { useWeiboPage } from '@/features/weibo/route/use-weibo-page'
import { loadStatusComments, loadStatusDetail } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

function StatusCommentsSection({
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

export function StatusDetailPage() {
  const ctx = useAppShellContext()
  const navigate = useNavigate()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const urlStatusId = page.kind === 'status' ? page.statusId : null
  const authorId = page.kind === 'status' ? page.authorId : null
  const isEnabled = rewriteEnabled && page.kind === 'status'

  const detailQuery = useQuery({
    queryKey: ['weibo', 'status', urlStatusId],
    queryFn: () => loadStatusDetail(urlStatusId!),
    enabled: isEnabled && urlStatusId !== null,
  })
  const detail = detailQuery.data

  return (
    <div>
      {detailQuery.isLoading ? <PageLoadingState label="正在加载此微博..." /> : null}
      {detailQuery.error instanceof Error ? (
        <PageErrorState description={detailQuery.error.message} />
      ) : null}
      {detail ? (
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
