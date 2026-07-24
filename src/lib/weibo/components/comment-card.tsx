import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircleIcon, Trash2 } from 'lucide-react'
import { memo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CommentBox } from '@/lib/weibo/components/comment-box'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { StatusText } from '@/lib/weibo/components/status-text'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import {
  cancelCommentLike,
  deleteWeiboComment,
  flattenInfiniteItems,
  nestedCommentsInfiniteOptions,
  setCommentLike,
} from '@/lib/weibo/data/weibo-data'
import { useFontSettings } from '@/lib/weibo/hooks/use-font-settings'
import { composeTargetFromComment } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import {
  optimisticallyToggleCommentLike,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'

const HIT_TARGET =
  'relative after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2'

function ReplyCommentPreview({ reply }: { reply: NonNullable<CommentItem['replyComment']> }) {
  return (
    <p className="text-muted-foreground truncate text-xs">
      回复{' '}
      <UserHoverCard uid={reply.author.id}>
        <Link
          to={`/n/${encodeURIComponent(reply.author.name)}`}
          className="text-foreground/80 font-medium hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          @{reply.author.name}
        </Link>
      </UserHoverCard>
      {reply.text ? (
        <>
          <span className="text-muted-foreground/80">：</span>
          <span className="text-muted-foreground">{reply.text}</span>
        </>
      ) : null}
    </p>
  )
}

export const CommentCard = memo(function CommentCard({
  item,
  rootStatusId,
  authorUid,
  depth = 0,
}: {
  item: CommentItem
  rootStatusId: string
  authorUid?: string
  /** Nesting depth for thread chrome (0 = root comment in list). */
  depth?: number
}) {
  const [showInlineReply, setShowInlineReply] = useState(false)
  const [showMoreReplies, setShowMoreReplies] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const uid = getCurrentUserUid()
  const isOwner = uid !== null && uid === item.author.id
  const isStatusAuthor = authorUid !== undefined && authorUid !== '' && authorUid === item.author.id
  const { textClassName } = useFontSettings()
  const queryClient = useQueryClient()
  const canLoadMore =
    Boolean(item.moreInfoText) && Boolean(authorUid) && authorUid !== undefined && authorUid !== ''

  const moreRepliesQuery = useInfiniteQuery({
    ...nestedCommentsInfiniteOptions(item.id, authorUid ?? '', showMoreReplies && canLoadMore),
  })
  const moreReplies = flattenInfiniteItems(moreRepliesQuery.data?.pages)

  const likeMutation = useMutation({
    mutationFn: async (target: CommentItem) => {
      if (target.liked) {
        await cancelCommentLike(target.id)
      } else {
        await setCommentLike(target.id)
      }
    },
    onMutate: (target: CommentItem) => optimisticallyToggleCommentLike(queryClient, target),
    onError: (_error, _target, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(_error instanceof Error ? _error.message : '操作失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWeiboComment(item.id),
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: () => {
      toast.success('已删除评论')
      setConfirmDeleteOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const liked = item.liked === true
  const nestedPreview = Array.isArray(item.comments) ? item.comments : []
  const avatarSize = depth > 0 ? 'size-7' : 'size-8'

  const handleUserLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation()
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
  }

  const handleReplyClick = () => {
    setShowInlineReply((open) => !open)
  }

  return (
    <div className={cn('flex gap-3', depth > 0 && 'border-border/60 relative border-l pl-3')}>
      <UserHoverCard uid={item.author.id}>
        <Link to={`/n/${encodeURIComponent(item.author.name)}`} onClick={handleUserLinkClick}>
          <UserAvatar
            author={item.author}
            sizeClassName={avatarSize}
            fallbackClassName="text-[10px] font-semibold"
          />
        </Link>
      </UserHoverCard>
      <div className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        {isOwner ? (
          <div className="absolute top-0 right-0 z-10">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn('text-muted-foreground size-8 shrink-0', HIT_TARGET)}
              aria-label="删除评论"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', isOwner && 'pr-9')}>
          <UserHoverCard uid={item.author.id}>
            <Link to={`/n/${encodeURIComponent(item.author.name)}`} onClick={handleUserLinkClick}>
              <span className="text-foreground truncate text-sm font-semibold hover:underline">
                {item.author.name}
              </span>
            </Link>
          </UserHoverCard>
          {isStatusAuthor ? (
            <span className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px] font-medium">
              博主
            </span>
          ) : null}
          <CreatedAtBadge label={item.createdAtLabel} />
        </div>

        {item.replyComment ? <ReplyCommentPreview reply={item.replyComment} /> : null}

        <div className={cn('whitespace-pre-wrap text-foreground', textClassName)}>
          <StatusText
            item={{ emoticons: item.emoticons, urlEntities: item.urlEntities }}
            text={item.text || ''}
          />
        </div>

        <div className="mt-0.5">
          <ImageCarousel images={item.images} />
        </div>

        <div className="text-muted-foreground flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="回复评论"
            aria-expanded={showInlineReply}
            className={cn(
              'text-muted-foreground size-8',
              HIT_TARGET,
              'hover:bg-sky-500/10 hover:text-sky-500',
            )}
            onClick={handleReplyClick}
          >
            <MessageCircleIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={liked ? '取消点赞' : '点赞评论'}
            aria-pressed={liked}
            aria-busy={likeMutation.isPending || undefined}
            disabled={likeMutation.isPending}
            className={cn(
              'text-muted-foreground min-h-10 gap-1',
              HIT_TARGET,
              'hover:bg-rose-500/10 hover:text-rose-500',
            )}
            onClick={() => likeMutation.mutate(item)}
          >
            <Heart
              className={cn(
                'size-3.5 transition-[color,fill] duration-200',
                liked ? 'fill-rose-500 text-rose-500' : 'hover:text-rose-500',
              )}
            />
            {item.likeCount > 0 ? (
              <span className={cn(liked && 'text-rose-500')}>{item.likeCount}</span>
            ) : null}
          </Button>
        </div>

        {showInlineReply ? (
          <div className="mt-2">
            <CommentBox
              target={composeTargetFromComment(rootStatusId, item)}
              placeholder={`回复 @${item.author.name}`}
              compact
              onSubmitSuccess={() => {
                setShowInlineReply(false)
              }}
            />
          </div>
        ) : null}

        {nestedPreview.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            {nestedPreview.map((child) => (
              <CommentCard
                key={child.id}
                item={child}
                rootStatusId={rootStatusId}
                authorUid={authorUid}
                depth={depth + 1}
              />
            ))}
          </div>
        ) : null}

        {canLoadMore ? (
          <div className="mt-1">
            {!showMoreReplies ? (
              <Button
                variant="link"
                size="xs"
                className="h-auto px-0"
                onClick={() => setShowMoreReplies(true)}
              >
                {item.moreInfoText}
              </Button>
            ) : (
              <div className="mt-1 flex flex-col gap-2">
                {moreRepliesQuery.isLoading ? (
                  <p className="text-muted-foreground text-xs">正在加载回复…</p>
                ) : null}
                {moreRepliesQuery.error instanceof Error ? (
                  <p className="text-destructive text-xs">{moreRepliesQuery.error.message}</p>
                ) : null}
                {moreReplies.map((child) => (
                  <CommentCard
                    key={child.id}
                    item={child}
                    rootStatusId={rootStatusId}
                    authorUid={authorUid}
                    depth={depth + 1}
                  />
                ))}
                {moreRepliesQuery.hasNextPage ? (
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto px-0"
                    disabled={moreRepliesQuery.isFetchingNextPage}
                    onClick={() => void moreRepliesQuery.fetchNextPage()}
                  >
                    {moreRepliesQuery.isFetchingNextPage ? '加载中…' : '加载更多回复'}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>删除这条评论？</DialogTitle>
              <DialogDescription>删除后无法恢复，微博原站也会同步删除。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending || undefined}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? '删除中…' : '删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
})
