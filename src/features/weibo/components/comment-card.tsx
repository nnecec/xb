import { Heart, MessageCircleIcon } from 'lucide-react'
import { type MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { StatusText } from '@/features/weibo/components/status-text'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentItem } from '@/features/weibo/models/status'

function createCommentComposeTarget({
  rootStatusId,
  comment,
}: {
  rootStatusId: string
  comment: CommentItem
}): ComposeTarget {
  return {
    kind: 'comment',
    mode: 'comment',
    statusId: rootStatusId,
    targetCommentId: comment.id,
    authorName: comment.author.name,
    excerpt: comment.text.trim().slice(0, 80),
  }
}

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

function NestedCommentCard({
  comment,
  rootStatusId,
  onCommentReply,
  onNavigate,
}: {
  comment: CommentItem
  rootStatusId: string
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
}) {
  return (
    <>
      <div className="border border-border/70 bg-muted/50 p-3 rounded-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar
              author={comment.author}
              sizeClassName="size-6"
              fallbackClassName="text-[10px] font-semibold"
            />
            <span className="truncate text-xs font-medium">{comment.author.name}</span>
          </div>
          <CreatedAtBadge label={comment.createdAtLabel} className="text-[10px]" />
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
            onClick={() => onCommentReply?.(createCommentComposeTarget({ rootStatusId, comment }))}
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
              <NestedCommentCard
                key={child.id}
                comment={child}
                rootStatusId={rootStatusId}
                onCommentReply={onCommentReply}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ImageCarousel images={comment.images} />
    </>
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
    <>
      <Card className="gap-3 border-border/70 bg-card/95 py-3 shadow-none">
        <CardHeader className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 px-4">
          <UserAvatar
            author={item.author}
            sizeClassName="size-10"
            fallbackClassName="text-xs font-semibold"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-sm">{item.author.name}</CardTitle>
              <CreatedAtBadge label={item.createdAtLabel} className="text-[10px]" />
            </div>
            {item.source ? (
              <p className="truncate text-[11px] text-muted-foreground">{item.source}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            <StatusText item={item} text={item.text || ''} />
          </div>
          <ImageCarousel images={item.images} />

          {item.replyComment ? (
            <div className="border border-border/60 bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-foreground/80">
                回复 @{item.replyComment.author.name}
              </p>
              {item.replyComment.text ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  <StatusText item={item.replyComment} text={item.replyComment.text || ''} />
                </p>
              ) : null}
              <ImageCarousel images={item.replyComment.images} />
            </div>
          ) : null}

          {item.retweetedStatus ? (
            <RetweetedStatusBlock item={item.retweetedStatus} onNavigate={onNavigate} />
          ) : null}

          {item.comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {item.comments.map((child) => (
                <NestedCommentCard
                  key={child.id}
                  comment={child}
                  rootStatusId={rootStatusId}
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
                onCommentReply?.(createCommentComposeTarget({ rootStatusId, comment: item }))
              }
            >
              <MessageCircleIcon className="size-3" />
            </Button>
            <Button variant="ghost" className="gap-1 text-xs" size="sm">
              <Heart className="size-3" />
              {item.likeCount}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ImageCarousel images={item.images} />
      <ImageCarousel images={item.replyComment?.images ?? []} />
    </>
  )
}
