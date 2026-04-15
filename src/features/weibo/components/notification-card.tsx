import { Link } from 'react-router'

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import { MentionInlineText } from '@/features/weibo/components/status-text'
import type {
  CommentNotification,
  LikeNotification,
  MentionNotification,
  NotificationItem,
} from '@/features/weibo/models/notification'
import { cn } from '@/lib/utils'

function isCommentNotification(item: NotificationItem): item is CommentNotification {
  return 'text' in item && 'user' in item && 'status' in item
}

function isMentionNotification(item: NotificationItem): item is MentionNotification {
  return 'textRaw' in item && 'status' in item
}

function isLikeNotification(item: NotificationItem): item is LikeNotification {
  return 'status' in item && !('text' in item) && !('textRaw' in item)
}

function NotificationHeader({
  user,
  createdAtLabel,
  source,
}: {
  user: { id: string; name: string; avatarUrl: string | null }
  createdAtLabel: string
  source?: string
}) {
  return (
    <CardHeader className="flex flex-row gap-3 px-4">
      <UserHoverCard uid={user.id}>
        <Link to={`/n/${encodeURIComponent(user.name)}`}>
          <UserAvatar
            author={user}
            sizeClassName="size-12"
            fallbackClassName="text-sm font-semibold"
          />
        </Link>
      </UserHoverCard>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserHoverCard uid={user.id}>
                <Link to={`/n/${encodeURIComponent(user.name)}`}>
                  <span className="truncate text-base hover:underline">{user.name}</span>
                </Link>
              </UserHoverCard>
              <CreatedAtBadge label={createdAtLabel} />
            </div>
            <CardDescription className="text-xs">
              {source ?? ''}
            </CardDescription>
          </div>
        </div>
      </div>
    </CardHeader>
  )
}

function ReplyCommentBlock({
  replyComment,
}: {
  replyComment: { id: string; text: string; user: { id: string; name: string; avatarUrl: string | null } }
}) {
  return (
    <div className="border-border/70 bg-muted/40 flex flex-col gap-2 border p-3">
      <div className="flex flex-col gap-1">
        <UserHoverCard uid={replyComment.user.id}>
          <Link
            to={`/n/${encodeURIComponent(replyComment.user.name)}`}
            className="text-sm hover:underline"
          >
            @{replyComment.user.name}
          </Link>
        </UserHoverCard>
        <p className="text-foreground text-sm">
          <MentionInlineText text={replyComment.text} />
        </p>
      </div>
    </div>
  )
}

function CommentNotificationContent({ item }: { item: CommentNotification }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm">
        <MentionInlineText text={item.text} />
      </p>
      {item.replyComment && <ReplyCommentBlock replyComment={item.replyComment} />}
    </div>
  )
}

function MentionNotificationContent({ item }: { item: MentionNotification }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm">
        <MentionInlineText text={item.textRaw} />
      </p>
      {item.status && (
        <div className="border-border/70 bg-muted/40 flex flex-col gap-2 border p-3">
          <div className="flex flex-col gap-1">
            <UserHoverCard uid={item.status.author.id}>
              <Link
                to={`/n/${encodeURIComponent(item.status.author.name)}`}
                className="text-sm hover:underline"
              >
                @{item.status.author.name}
              </Link>
            </UserHoverCard>
            <p className="text-foreground text-sm">
              <MentionInlineText text={item.status.textRaw} />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function LikeNotificationContent({ item }: { item: LikeNotification }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">赞了你的微博</p>
      {item.status && (
        <div className="border-border/70 bg-muted/40 flex flex-col gap-2 border p-3">
          <div className="flex flex-col gap-1">
            <UserHoverCard uid={item.status.author.id}>
              <Link
                to={`/n/${encodeURIComponent(item.status.author.name)}`}
                className="text-sm hover:underline"
              >
                @{item.status.author.name}
              </Link>
            </UserHoverCard>
            <p className="text-foreground text-sm">
              <MentionInlineText text={item.status.text} />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function NotificationCard({
  item,
  className,
}: {
  item: NotificationItem
  className?: string
}) {
  return (
    <Card className={cn('gap-4 py-4', className)}>
      <NotificationHeader
        user={item.user}
        createdAtLabel={item.createdAtLabel}
        source={item.source}
      />
      <CardContent className="flex flex-col px-4">
        {isCommentNotification(item) && <CommentNotificationContent item={item} />}
        {isMentionNotification(item) && <MentionNotificationContent item={item} />}
        {isLikeNotification(item) && <LikeNotificationContent item={item} />}
      </CardContent>
    </Card>
  )
}
