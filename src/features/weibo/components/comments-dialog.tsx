import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageEmptyState, PageErrorState } from '@/features/weibo/components/page-state'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import { loadNestedComments } from '@/features/weibo/services/weibo-repository'

import { CommentList } from './comment-list'

interface CommentsDialogProps {
  open: boolean
  statusId: string
  authorUid: string
  onOpenChange: (open: boolean) => void
  onCommentReply?: (target: ComposeTarget) => void
}

export function CommentsDialog({
  open,
  statusId,
  authorUid,
  onOpenChange,
  onCommentReply,
}: CommentsDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weibo', 'nested-comments', statusId],
    queryFn: () => loadNestedComments(statusId, authorUid),
    enabled: open && statusId !== '' && authorUid !== '',
  })

  const comments = data?.items ? [...data.items].reverse() : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>评论详情</DialogTitle>
          <DialogDescription>共 {data?.items.length ?? 0} 条回复</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error instanceof Error ? (
            <PageErrorState description={error.message} />
          ) : comments.length === 0 ? (
            <PageEmptyState label="暂无评论" />
          ) : (
            <CommentList
              comments={comments}
              emptyLabel="此微博暂无评论"
              rootStatusId={statusId}
              authorUid={authorUid ?? undefined}
              onCommentReply={onCommentReply}
            />
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
