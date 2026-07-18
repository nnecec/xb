import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { RefreshCWIcon } from '@/components/ui/refresh-cw'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { CommentBox } from '@/lib/weibo/components/comment-box'
import { CommentList } from '@/lib/weibo/components/comment-list'
import { FeedCard } from '@/lib/weibo/components/feed-card'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import {
  flattenInfiniteItems,
  statusCommentsInfiniteOptions,
  statusDetailQueryOptions,
} from '@/lib/weibo/data/weibo-data'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

function StatusCommentsSection({
  statusId,
  authorId,
  authorName,
  statusText,
  commentsCount,
  onCommentReply,
}: {
  statusId: string
  authorId: string
  authorName: string
  statusText: string
  commentsCount: number
  onCommentReply: ReturnType<typeof useAppShellContext>['setComposeTarget']
}) {
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const commentsQuery = useInfiniteQuery({
    ...statusCommentsInfiniteOptions(statusId, authorId, filter),
  })

  const comments = flattenInfiniteItems<CommentItem>(commentsQuery.data?.pages)
  const filterGroup = commentsQuery.data?.pages[0]?.filterGroup
  const selectedFilter = filterGroup?.find((item) => item.param === filter) ?? filterGroup?.[0]
  const errorMessage = commentsQuery.error instanceof Error ? commentsQuery.error.message : null

  return (
    <section className="bg-card/70 border-border/55 rounded-xl border shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <h2 className="text-foreground text-base leading-5 font-semibold">评论</h2>
            <p className="text-muted-foreground truncate text-xs tabular-nums">
              {formatWeiboCount(commentsCount)} 条互动
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          {filterGroup && filterGroup.length > 0 && selectedFilter ? (
            <Select value={selectedFilter.param} onValueChange={(value) => setFilter(value)}>
              <SelectTrigger size="sm" className="min-w-32 sm:min-w-40">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="刷新评论"
            onClick={async () => {
              await commentsQuery.refetch()
              toast.success('评论刷新成功')
            }}
            disabled={commentsQuery.isFetching}
          >
            <RefreshCWIcon className={`size-3 ${commentsQuery.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <CommentBox
          target={{
            kind: 'status',
            mode: 'comment',
            statusId,
            targetCommentId: null,
            authorName,
            excerpt: statusText.trim().slice(0, 80),
          }}
          placeholder="写下你的评论"
        />

        <div className="pt-4">
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
        </div>

        {commentsQuery.hasNextPage ? (
          <Button
            variant="outline"
            className="w-full"
            static
            onClick={() => void commentsQuery.fetchNextPage()}
            disabled={commentsQuery.isFetchingNextPage}
          >
            {commentsQuery.isFetchingNextPage ? '加载中...' : '加载更多评论'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function handleGoBack() {
  if (window.history.length > 2) {
    window.history.back()
  } else {
    window.location.href = 'https://weibo.com'
  }
}

function StatusDetailTopBar({
  showStatusSummary,
  authorName,
  createdAtLabel,
  statusText,
  regionName,
}: {
  showStatusSummary: boolean
  authorName?: string
  createdAtLabel?: string
  statusText?: string
  source?: string
  regionName?: string
}) {
  return (
    <div className="bg-background/85 border-border/45 sticky top-0 z-50 border-b backdrop-blur-lg">
      <div className="relative flex min-h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="返回"
            className="shrink-0"
            onClick={handleGoBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              {showStatusSummary ? (
                <motion.div
                  key="status-summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="min-w-0"
                >
                  <h1 className="text-foreground truncate text-lg leading-6 font-semibold">
                    {authorName ?? '正文'}{' '}
                    <span className="text-muted-foreground space-x-1 text-xs">
                      {createdAtLabel && <span>{createdAtLabel}</span>}
                      {regionName && <span>{regionName}</span>}
                    </span>
                  </h1>
                  <p className="text-muted-foreground line-clamp-1 truncate text-xs">
                    {statusText ? statusText : '详情页'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="default-title"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="min-w-0"
                >
                  <h1 className="text-foreground truncate text-lg leading-6 font-semibold">
                    微博正文
                  </h1>
                  <p className="text-muted-foreground truncate text-xs">详情页</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatusDetailPage() {
  const ctx = useAppShellContext()
  const navigate = useNavigate()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const statusArticleRef = useRef<HTMLElement | null>(null)
  const [showStatusSummary, setShowStatusSummary] = useState(false)

  useEffect(() => {
    ctx.resetMainScroll()
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [ctx.resetMainScroll])

  const urlStatusId = page.kind === 'status' ? page.statusId : null
  const authorId = page.kind === 'status' ? page.authorId : null
  const isEnabled = rewriteEnabled && page.kind === 'status'

  const detailQuery = useQuery({
    ...statusDetailQueryOptions(urlStatusId, isEnabled),
  })
  const detail = detailQuery.data

  useEffect(() => {
    if (detail) {
      browsingHistoryStore.getState().addEntry(detail.status)
    }
  }, [detail])

  useEffect(() => {
    const article = statusArticleRef.current
    if (!article || !detail) {
      setShowStatusSummary(false)
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShowStatusSummary(false)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setShowStatusSummary(entries[0]?.isIntersecting === false)
      },
      { threshold: 0 },
    )

    observer.observe(article)
    return () => observer.disconnect()
  }, [detail])

  return (
    <div className="relative pb-8">
      <StatusDetailTopBar
        showStatusSummary={showStatusSummary}
        authorName={detail?.status.author.name}
        createdAtLabel={detail?.status.createdAtLabel}
        statusText={detail?.status.text}
        source={detail?.status.source}
        regionName={detail?.status.regionName}
      />

      {detailQuery.isLoading ? <PageLoadingState label="正在加载此微博..." /> : null}
      {detailQuery.error instanceof Error ? (
        <PageErrorState description={detailQuery.error.message} />
      ) : null}
      {detail ? (
        <div className="flex w-full flex-col gap-4">
          <article ref={statusArticleRef} className="relative">
            <div className="bg-primary/70 absolute top-5 bottom-5 left-0 hidden w-px sm:block" />
            <FeedCard
              item={detail.status}
              surface="detail"
              className="border-border/55 bg-card/95 shadow-[0_16px_40px_rgb(0_0_0/0.08)] dark:shadow-black/20"
              onNavigate={ctx.navigateToStatusDetail}
              onCommentClick={(item) =>
                ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
              }
              onRepostClick={(item) =>
                ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))
              }
              onStatusDeleted={() => navigate(-1)}
            />
          </article>
          {authorId ? (
            <StatusCommentsSection
              statusId={detail.status.id}
              authorId={authorId}
              authorName={detail.status.author.name}
              statusText={detail.status.text}
              commentsCount={detail.status.stats.comments}
              onCommentReply={ctx.setComposeTarget}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
