import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircleIcon, Trash2 } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { CollapsibleMedia } from '@/lib/weibo/components/collapsible-media'
import { CommentBox } from '@/lib/weibo/components/comment-box'
import { CommentsDialog } from '@/lib/weibo/components/comments-dialog'
import { buildMediaCollectionItems, MediaCollection } from '@/lib/weibo/components/media-collection'
import { StatusText } from '@/lib/weibo/components/status-text'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import { cancelCommentLike, deleteWeiboComment, setCommentLike } from '@/lib/weibo/data/weibo-data'
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
  const [showNestedCommentsDialog, setShowNestedCommentsDialog] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const {
    commentDensity,
    commentCardShowAvatar,
    commentCardShowTimestamp,
    commentCardShowPublishInfo,
    commentCardShowAuthorBadge,
    commentCardShowLikeCount,
    commentCardShowThreadLine,
    commentCardImageDisplay,
    commentCardCollapseRepliesByDefault,
  } = useAppSettings(
    useShallow((settings) => ({
      commentDensity: settings.commentDensity,
      commentCardShowAvatar: settings.commentCardShowAvatar,
      commentCardShowTimestamp: settings.commentCardShowTimestamp,
      commentCardShowPublishInfo: settings.commentCardShowPublishInfo,
      commentCardShowAuthorBadge: settings.commentCardShowAuthorBadge,
      commentCardShowLikeCount: settings.commentCardShowLikeCount,
      commentCardShowThreadLine: settings.commentCardShowThreadLine,
      commentCardImageDisplay: settings.commentCardImageDisplay,
      commentCardCollapseRepliesByDefault: settings.commentCardCollapseRepliesByDefault,
    })),
  )
  const [showNestedReplies, setShowNestedReplies] = useState(!commentCardCollapseRepliesByDefault)
  const uid = getCurrentUserUid()
  const isOwner = uid !== null && uid === item.author.id
  const isStatusAuthor = authorUid !== undefined && authorUid !== '' && authorUid === item.author.id
  const { textClassName } = useFontSettings()
  const queryClient = useQueryClient()
  const canLoadMore =
    Boolean(item.moreInfoText) && Boolean(authorUid) && authorUid !== undefined && authorUid !== ''

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

  useEffect(() => {
    setShowNestedReplies(!commentCardCollapseRepliesByDefault)
  }, [commentCardCollapseRepliesByDefault])

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
    <div
      className={cn(
        'flex',
        commentDensity === 'compact' && 'gap-2',
        commentDensity === 'standard' && 'gap-3',
        commentDensity === 'relaxed' && 'gap-4',
        depth > 0 && 'relative pl-3',
        depth > 0 && commentCardShowThreadLine && 'border-l border-border/60',
      )}
    >
      {commentCardShowAvatar ? (
        <UserHoverCard uid={item.author.id}>
          <Link to={`/n/${encodeURIComponent(item.author.name)}`} onClick={handleUserLinkClick}>
            <UserAvatar
              author={item.author}
              sizeClassName={avatarSize}
              fallbackClassName="text-[10px] font-semibold"
            />
          </Link>
        </UserHoverCard>
      ) : null}
      <div
        className={cn(
          'relative flex min-w-0 flex-1 flex-col',
          commentDensity === 'compact' && 'gap-0',
          commentDensity === 'standard' && 'gap-0.5',
          commentDensity === 'relaxed' && 'gap-1',
        )}
      >
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
          {isStatusAuthor && commentCardShowAuthorBadge ? (
            <Badge variant="secondary">博主</Badge>
          ) : null}
          {commentCardShowTimestamp ? <CreatedAtBadge label={item.createdAtLabel} /> : null}
        </div>

        {commentCardShowPublishInfo && item.source ? (
          <p className="text-muted-foreground text-xs">{item.source}</p>
        ) : null}

        <div className={cn('whitespace-pre-wrap text-foreground', textClassName)}>
          <StatusText
            item={{ emoticons: item.emoticons, urlEntities: item.urlEntities }}
            text={item.text || ''}
            imageDisplay={commentCardImageDisplay}
          />
        </div>

        {item.images.length > 0 ? (
          <div className="mt-0.5">
            <CollapsibleMedia
              display={commentCardImageDisplay}
              summary={`此评论包含 ${item.images.length} 张图片`}
            >
              <MediaCollection items={buildMediaCollectionItems(item.images)} />
            </CollapsibleMedia>
          </div>
        ) : null}

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
            {commentCardShowLikeCount && item.likeCount > 0 ? (
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

        {nestedPreview.length > 0 && !showNestedReplies ? (
          <Button
            variant="link"
            size="xs"
            className="mt-1 h-auto w-fit px-0"
            onClick={() => setShowNestedReplies(true)}
          >
            查看 {nestedPreview.length} 条回复
          </Button>
        ) : null}

        {nestedPreview.length > 0 && showNestedReplies ? (
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
            <Button
              variant="link"
              size="xs"
              className="h-auto px-0"
              onClick={() => setShowNestedCommentsDialog(true)}
            >
              {item.moreInfoText}
            </Button>
          </div>
        ) : null}

        <CommentsDialog
          open={showNestedCommentsDialog}
          rootStatusId={rootStatusId}
          statusId={item.id}
          authorUid={authorUid ?? ''}
          onOpenChange={setShowNestedCommentsDialog}
        />

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
