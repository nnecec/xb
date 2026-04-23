import { useMutation } from '@tanstack/react-query'
import { Heart, MessageCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
import { deleteWeiboComment } from '@/lib/weibo/services/weibo-repository'

export function CommentCard({
  item,
  rootStatusId,
  authorUid,
  onCommentReply,
}: {
  item: CommentItem
  rootStatusId: string
  authorUid?: string
  onCommentReply?: (target: ComposeTarget) => void
}) {
  const [showNestedCommentsDialog, setShowNestedCommentsDialog] = useState(false)
  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === item.author.id
  const { fontSizeClass, fontFamilyClass } = useFontSettings()

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

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row gap-3">
        <UserHoverCard uid={item.author.id}>
          <Link
            to={`/n/${encodeURIComponent(item.author.name)}`}
            onClick={(event) => event.stopPropagation()}
          >
            <UserAvatar
              author={item.author}
              sizeClassName="size-10"
              fallbackClassName="text-xs font-semibold"
            />
          </Link>
        </UserHoverCard>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <UserHoverCard uid={item.author.id}>
                  <Link
                    to={`/n/${encodeURIComponent(item.author.name)}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <CardTitle className="truncate text-sm hover:underline">
                      {item.author.name}
                    </CardTitle>
                  </Link>
                </UserHoverCard>
                <CreatedAtBadge label={item.createdAtLabel} className="text-[10px]" />
              </div>
              {item.source ? (
                <p className="text-muted-foreground truncate text-[11px]">{item.source}</p>
              ) : null}
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
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <div
          className={cn(
            'whitespace-pre-wrap leading-6 text-foreground',
            fontSizeClass,
            fontFamilyClass,
          )}
        >
          <StatusText item={item} text={item.text || ''} />
        </div>
        <ImageCarousel images={item.images} />

        {item.comments.length > 0 ? (
          <div className="flex flex-col gap-2">
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
                className="mt-1"
                variant="secondary"
                onClick={() => setShowNestedCommentsDialog(true)}
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
          onOpenChange={setShowNestedCommentsDialog}
          onCommentReply={onCommentReply}
        />

        <div className="text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="回复评论"
            onClick={() => onCommentReply?.(composeTargetFromComment(rootStatusId, item))}
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
  )
}
