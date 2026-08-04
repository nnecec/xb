import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CommentList } from '@/lib/weibo/components/comment-list'
import { PageEmptyState, PageErrorState } from '@/lib/weibo/components/page-state'
import { flattenInfiniteItems, nestedCommentsInfiniteOptions } from '@/lib/weibo/data/weibo-data'

interface CommentsDialogProps {
  open: boolean
  rootStatusId: string
  statusId: string
  authorUid: string
  onOpenChange: (open: boolean) => void
}

/** Modal list for the complete reply thread of a comment. */
export function CommentsDialog({
  open,
  rootStatusId,
  statusId,
  authorUid,
  onOpenChange,
}: CommentsDialogProps) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      ...nestedCommentsInfiniteOptions(statusId, authorUid, open),
    })

  // Dialog content is portaled, so use a callback ref to bind scrolling after mount.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    setScrollEl(node)
  }, [])
  const fetchNextPageRef = useRef(fetchNextPage)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  fetchNextPageRef.current = fetchNextPage
  isFetchingNextPageRef.current = isFetchingNextPage

  const comments = flattenInfiniteItems(data?.pages)
  const total = data?.pages[0]?.total ?? comments.length

  useEffect(() => {
    if (!scrollEl || !hasNextPage) return

    const handleScroll = () => {
      if (isFetchingNextPageRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = scrollEl
      if (scrollHeight - scrollTop - clientHeight < 100) {
        void fetchNextPageRef.current()
      }
    }

    scrollEl.addEventListener('scroll', handleScroll)
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, scrollEl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>评论详情</DialogTitle>
          <DialogDescription>共 {total} 条回复</DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          data-testid="comments-dialog-scroll"
          className="max-h-[60vh] overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : error instanceof Error ? (
            <PageErrorState description={error.message} />
          ) : comments.length === 0 ? (
            <PageEmptyState label="暂无评论" />
          ) : (
            <>
              <CommentList
                comments={comments}
                emptyLabel="暂无回复"
                rootStatusId={rootStatusId}
                authorUid={authorUid}
              />
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
