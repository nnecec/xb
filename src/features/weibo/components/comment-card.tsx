import { useState } from 'react'
import { Heart } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { ImageGrid } from '@/features/weibo/components/image-grid'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import { StatusText } from '@/features/weibo/components/status-text'
import type { FeedImage } from '@/features/weibo/models/feed'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import type { CommentItem } from '@/features/weibo/models/status'

function CommentImageBlock({
  images,
  onImageClick,
  className = 'mt-3 grid max-w-[240px] grid-cols-3 gap-1.5',
}: {
  images: FeedImage[]
  onImageClick: (index: number) => void
  className?: string
}) {
  return <ImageGrid images={images} onImageClick={onImageClick} className={className} />
}

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

function NestedCommentCard({
  comment,
  rootStatusId,
  onCommentReply,
}: {
  comment: CommentItem
  rootStatusId: string
  onCommentReply?: (target: ComposeTarget) => void
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [startImageIndex, setStartImageIndex] = useState(0)

  return (
    <>
      <div className="rounded-2xl border border-border/70 bg-muted/50 p-3">
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
        <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
          <StatusText item={comment} text={comment.text || ''} />
        </p>
        <CommentImageBlock
          images={comment.images}
          onImageClick={(index) => {
            setStartImageIndex(index)
            setImageDialogOpen(true)
          }}
          className="mt-2 grid max-w-[180px] grid-cols-3 gap-1"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs hover:bg-muted"
            onClick={() => onCommentReply?.(createCommentComposeTarget({ rootStatusId, comment }))}
          >
            回复评论
          </button>
          <div className="flex items-center gap-1">
            <Heart className="size-3.5" />
            <span>{comment.likeCount}</span>
          </div>
        </div>
        {comment.comments.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2 border-l border-border/70 pl-2">
            {comment.comments.map((child) => (
              <NestedCommentCard
                key={child.id}
                comment={child}
                rootStatusId={rootStatusId}
                onCommentReply={onCommentReply}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ImageCarousel
        images={comment.images}
        startIndex={startImageIndex}
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
      />
    </>
  )
}

export function CommentCard({
  item,
  rootStatusId,
  onCommentReply,
}: {
  item: CommentItem
  rootStatusId: string
  onCommentReply?: (target: ComposeTarget) => void
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [startImageIndex, setStartImageIndex] = useState(0)
  const [replyImageDialogOpen, setReplyImageDialogOpen] = useState(false)
  const [replyStartImageIndex, setReplyStartImageIndex] = useState(0)

  return (
    <>
      <Card className="gap-3 rounded-[24px] border-border/70 bg-card/95 py-3 shadow-none">
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
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            <StatusText item={item} text={item.text || ''} />
          </p>
          <CommentImageBlock
            images={item.images}
            onImageClick={(index) => {
              setStartImageIndex(index)
              setImageDialogOpen(true)
            }}
          />

          {item.replyComment ? (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-foreground/80">
                回复 @{item.replyComment.author.name}
              </p>
              {item.replyComment.text ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  <StatusText item={item.replyComment} text={item.replyComment.text || ''} />
                </p>
              ) : null}
              <CommentImageBlock
                images={item.replyComment.images}
                onImageClick={(index) => {
                  setReplyStartImageIndex(index)
                  setReplyImageDialogOpen(true)
                }}
                className="mt-2 grid max-w-[180px] grid-cols-3 gap-1"
              />
            </div>
          ) : null}

          {item.comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {item.comments.map((child) => (
                <NestedCommentCard
                  key={child.id}
                  comment={child}
                  rootStatusId={rootStatusId}
                  onCommentReply={onCommentReply}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs hover:bg-muted"
              onClick={() => onCommentReply?.(createCommentComposeTarget({ rootStatusId, comment: item }))}
            >
              回复评论
            </button>
            <div className="flex items-center gap-1">
              <Heart className="size-3.5" />
              <span>{item.likeCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <ImageCarousel
        images={item.images}
        startIndex={startImageIndex}
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
      />
      <ImageCarousel
        images={item.replyComment?.images ?? []}
        startIndex={replyStartImageIndex}
        open={replyImageDialogOpen}
        onOpenChange={setReplyImageDialogOpen}
      />
    </>
  )
}
