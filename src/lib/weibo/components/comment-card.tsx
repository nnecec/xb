import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircleIcon } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { CommentsDialog } from '@/lib/weibo/components/comments-dialog'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { StatusText } from '@/lib/weibo/components/status-text'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import { useFontSettings } from '@/lib/weibo/hooks/use-font-settings'
import { type ComposeTarget, composeTargetFromComment } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import {
  cancelCommentLike,
  deleteWeiboComment,
  setCommentLike,
} from '@/lib/weibo/services/weibo-repository'

export const CommentCard = memo(function CommentCard({
  item,
  rootStatusId,
  authorUid,
  zIndex,
  onCommentReply,
}: {
  item: CommentItem
  rootStatusId: string
  authorUid?: string
  zIndex?: number
  onCommentReply?: (target: ComposeTarget) => void
}) {
  const [showNestedCommentsDialog, setShowNestedCommentsDialog] = useState(false)
  const [commentsDialogZIndex, setCommentsDialogZIndex] = useState<number>()
  const appCtx = useAppShellContext()
  const handleOpenNestedComments = useCallback(() => {
    if (appCtx) {
      setCommentsDialogZIndex(appCtx.getNextZIndex())
    } else {
      setCommentsDialogZIndex(zIndex)
    }
    setShowNestedCommentsDialog(true)
  }, [appCtx, zIndex])
  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === item.author.id
  const { fontSizeClass, fontWeightClass, letterSpacingClass, lineHeightClass, fontFamilyClass } =
    useFontSettings()
  const queryClient = useQueryClient()

  const likeMutation = useMutation({
    mutationFn: async (target: CommentItem) => {
      if (target.liked) {
        await cancelCommentLike(target.id)
      } else {
        await setCommentLike(target.id)
      }
    },
    onMutate: (target: CommentItem) => {
      queryClient.cancelQueries({ queryKey: ['weibo'] })

      const previousItems = queryClient.getQueriesData({ queryKey: ['weibo'] })

      queryClient.setQueriesData({ queryKey: ['weibo'] }, (old) => {
        if (!old || typeof old !== 'object') return old

        const updateCommentInTree = (comment: CommentItem): CommentItem => {
          if (comment.id === target.id) {
            return {
              ...comment,
              liked: !comment.liked,
              likeCount: comment.likeCount + (comment.liked ? -1 : 1),
            }
          }
          if ((comment.comments?.length ?? 0) > 0) {
            return {
              ...comment,
              comments: comment.comments!.map(updateCommentInTree),
            }
          }
          return comment
        }

        if ('pages' in old) {
          const data = old as { pages: { items: CommentItem[] }[] }
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map(updateCommentInTree),
            })),
          }
        }
        return old
      })

      return { previousItems }
    },
    onError: (_error, _target, context) => {
      if (context?.previousItems) {
        for (const [queryKey, data] of context.previousItems) {
          queryClient.setQueryData(queryKey, data)
        }
      }
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
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const liked = item.liked === true

  return (
    <div className="group flex gap-3">
      <UserHoverCard uid={item.author.id}>
        <Link
          to={`/n/${encodeURIComponent(item.author.name)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <UserAvatar
            author={item.author}
            sizeClassName="size-8"
            fallbackClassName="text-[10px] font-semibold"
          />
        </Link>
      </UserHoverCard>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <UserHoverCard uid={item.author.id}>
              <Link
                to={`/n/${encodeURIComponent(item.author.name)}`}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="text-foreground truncate text-sm font-semibold hover:underline">
                  {item.author.name}
                </span>
              </Link>
            </UserHoverCard>
            <CreatedAtBadge label={item.createdAtLabel} className="px-1.5 py-0 text-[10px]" />
          </div>
          {showOwnerMenu ? (
            <FeedCardMoreMenu
              type="comment"
              isOwner={showOwnerMenu}
              contentLabel="这条评论"
              isDeleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutateAsync()}
            />
          ) : null}
        </div>

        {item.source ? (
          <p className="text-muted-foreground truncate text-xs">{item.source}</p>
        ) : null}

        <div
          className={cn(
            'whitespace-pre-wrap text-foreground',
            fontSizeClass,
            fontWeightClass,
            letterSpacingClass,
            lineHeightClass,
            fontFamilyClass,
          )}
        >
          <StatusText item={item} text={item.text || ''} />
        </div>

        <div className="mt-0.5">
          <ImageCarousel images={item.images} />
        </div>

        <div className="text-muted-foreground flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="回复评论"
            className="text-muted-foreground transition-transform duration-200 hover:text-sky-500 active:scale-[0.96]"
            onClick={() => onCommentReply?.(composeTargetFromComment(rootStatusId, item))}
          >
            <MessageCircleIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label={liked ? '取消点赞' : '点赞评论'}
            aria-pressed={liked}
            disabled={likeMutation.isPending}
            className="text-muted-foreground gap-1 transition-transform duration-200 hover:text-rose-500 active:scale-[0.96]"
            onClick={() => likeMutation.mutate(item)}
          >
            <Heart
              className={cn(
                'size-3 transition-all duration-200',
                liked ? 'fill-rose-500 text-rose-500' : 'hover:text-rose-500',
              )}
            />
            {item.likeCount > 0 && (
              <span className={cn(liked && 'text-rose-500')}>{item.likeCount}</span>
            )}
          </Button>
        </div>

        {Array.isArray(item.comments) && item.comments.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2 pl-3">
            {item.comments.map((child) => (
              <CommentCard
                key={child.id}
                item={child}
                rootStatusId={rootStatusId}
                authorUid={authorUid}
                onCommentReply={onCommentReply}
              />
            ))}
            {item.moreInfoText && authorUid ? (
              <Button
                type="button"
                variant="link"
                size="xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleOpenNestedComments}
              >
                {item.moreInfoText}
              </Button>
            ) : null}
          </div>
        ) : null}

        <CommentsDialog
          open={showNestedCommentsDialog}
          statusId={item.id}
          authorUid={authorUid ?? ''}
          zIndex={commentsDialogZIndex}
          onOpenChange={(open) => {
            setShowNestedCommentsDialog(open)
            if (!open) {
              setCommentsDialogZIndex(undefined)
            }
          }}
          onCommentReply={onCommentReply}
        />
      </div>
    </div>
  )
})
