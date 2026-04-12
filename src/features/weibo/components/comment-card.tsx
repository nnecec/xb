import { useMutation } from '@tanstack/react-query'
import { Heart, MessageCircleIcon } from 'lucide-react'
import { type MouseEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { OwnContentMoreMenu } from '@/features/weibo/components/own-content-more-menu'
import { StatusText } from '@/features/weibo/components/status-text'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import {
  type ComposeTarget,
  composeTargetFromComment,
} from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentItem } from '@/features/weibo/models/status'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import { deleteWeiboComment } from '@/features/weibo/services/weibo-repository'

function RetweetedStatusBlock({
  item,
  onNavigate,
}: {
  item: FeedItem
  onNavigate?: (item: FeedItem) => void
}) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!onNavigate) {
      return
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    onNavigate(item)
  }

  return (
    <div className="border border-border/70 bg-muted/40 p-3 cursor-pointer" onClick={handleClick}>
      <div className="mb-2 flex items-center gap-2">
        <UserAvatar
          author={item.author}
          sizeClassName="size-5"
          fallbackClassName="text-[10px] font-semibold"
        />
        <span className="truncate text-xs font-medium">{item.author.name}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-5 text-foreground/90">
        <StatusText item={item} text={item.text || ''} />
      </p>
      <ImageCarousel images={item.images} />
    </div>
  )
}

function CommentNode({
  comment,
  rootStatusId,
  depth,
  onCommentReply,
  onNavigate,
}: {
  comment: CommentItem
  rootStatusId: string
  depth: number
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
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

  const isRoot = depth === 0

  if (isRoot) {
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

          {comment.replyComment ? (
            <div className="border border-border/60 bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-foreground/80">
                回复 @{comment.replyComment.author.name}
              </p>
              {comment.replyComment.text ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  <StatusText item={comment.replyComment} text={comment.replyComment.text || ''} />
                </p>
              ) : null}
              <ImageCarousel images={comment.replyComment.images} />
            </div>
          ) : null}

          {comment.retweetedStatus ? (
            <RetweetedStatusBlock item={comment.retweetedStatus} onNavigate={onNavigate} />
          ) : null}

          {comment.comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {comment.comments.map((child) => (
                <CommentNode
                  key={child.id}
                  comment={child}
                  rootStatusId={rootStatusId}
                  depth={depth + 1}
                  onCommentReply={onCommentReply}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : null}

          <div className="text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="回复评论"
              onClick={() =>
                onCommentReply?.(composeTargetFromComment(rootStatusId, comment))
              }
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

  return (
    <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            author={comment.author}
            sizeClassName="size-6"
            fallbackClassName="text-[10px] font-semibold"
          />
          <span className="truncate text-xs font-medium">{comment.author.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CreatedAtBadge label={comment.createdAtLabel} className="text-[10px]" />
          {showOwnerMenu ? (
            <OwnContentMoreMenu
              contentLabel="这条评论"
              isDeleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutateAsync()}
            />
          ) : null}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-5 text-foreground/90">
        <StatusText item={comment} text={comment.text || ''} />
      </p>

      <ImageCarousel images={comment.images} />

      {comment.retweetedStatus ? (
        <RetweetedStatusBlock item={comment.retweetedStatus} onNavigate={onNavigate} />
      ) : null}

      <div className="text-muted-foreground">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
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
      {comment.comments.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 border-l border-border/70 pl-2">
          {comment.comments.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              rootStatusId={rootStatusId}
              depth={depth + 1}
              onCommentReply={onCommentReply}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CommentCard({
  item,
  rootStatusId,
  onCommentReply,
  onNavigate,
}: {
  item: CommentItem
  rootStatusId: string
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
  return (
    <CommentNode
      comment={item}
      rootStatusId={rootStatusId}
      depth={0}
      onCommentReply={onCommentReply}
      onNavigate={onNavigate}
    />
  )
}
