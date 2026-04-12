import { useMutation } from '@tanstack/react-query'
import { Heart, MessageCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommentsDialog } from '@/features/weibo/components/comments-dialog'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { OwnContentMoreMenu } from '@/features/weibo/components/own-content-more-menu'
import { StatusText } from '@/features/weibo/components/status-text'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import { type ComposeTarget, composeTargetFromComment } from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentItem } from '@/features/weibo/models/status'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import { deleteWeiboComment } from '@/features/weibo/services/weibo-repository'

function CommentNode({
  comment,
  rootStatusId,
  depth,
  onCommentReply,
  authorUid,
  onNavigate,
}: {
  comment: CommentItem
  rootStatusId: string
  depth: number
  authorUid?: string
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
  const [showNestedCommentsDialog, setShowNestedCommentsDialog] = useState(false)
  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === comment.author.id

  const deleteMutation = useMutation({
    mutationFn: () => deleteWeiboComment(comment.id),
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: () => {
      toast.success('已删除评论')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  return (
    <Card className="gap-3 border-border/70 bg-card/95 py-3 shadow-none">
      <CardHeader className="flex flex-row gap-3 px-4">
        <UserAvatar
          author={comment.author}
          sizeClassName="size-10"
          fallbackClassName="text-xs font-semibold"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-sm">{comment.author.name}</CardTitle>
                <CreatedAtBadge label={comment.createdAtLabel} className="text-[10px]" />
              </div>
              {comment.source ? (
                <p className="truncate text-[11px] text-muted-foreground">{comment.source}</p>
              ) : null}
            </div>
            {showOwnerMenu ? (
              <OwnContentMoreMenu
                contentLabel="这条评论"
                isDeleting={deleteMutation.isPending}
                onDelete={() => deleteMutation.mutateAsync()}
              />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          <StatusText item={comment} text={comment.text || ''} />
        </div>
        <ImageCarousel images={comment.images} />

        {comment.comments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {comment.comments.map((child) => (
              <CommentNode
                key={child.id}
                comment={child}
                rootStatusId={rootStatusId}
                depth={depth + 1}
                authorUid={authorUid}
                onCommentReply={onCommentReply}
                onNavigate={onNavigate}
              />
            ))}
            {comment.moreInfoText && authorUid ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => setShowNestedCommentsDialog(true)}
              >
                {comment.moreInfoText}
              </Button>
            ) : null}
          </div>
        ) : null}

        {comment.moreInfoText && authorUid && comment.comments.length === 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => setShowNestedCommentsDialog(true)}
          >
            {comment.moreInfoText}
          </Button>
        )}

        <CommentsDialog
          open={showNestedCommentsDialog}
          statusId={comment.id}
          authorUid={authorUid ?? ''}
          onOpenChange={setShowNestedCommentsDialog}
          onCommentReply={onCommentReply}
        />

        <div className="text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="回复评论"
            onClick={() => onCommentReply?.(composeTargetFromComment(rootStatusId, comment))}
          >
            <MessageCircleIcon className="size-3" />
          </Button>
          <Button variant="ghost" className="gap-1 text-xs" size="sm">
            <Heart className="size-3" />
            {comment.likeCount}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function CommentCard({
  item,
  rootStatusId,
  authorUid,
  onCommentReply,
  onNavigate,
}: {
  item: CommentItem
  rootStatusId: string
  authorUid?: string
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
  return (
    <CommentNode
      comment={item}
      rootStatusId={rootStatusId}
      depth={0}
      authorUid={authorUid}
      onCommentReply={onCommentReply}
      onNavigate={onNavigate}
    />
  )
}
