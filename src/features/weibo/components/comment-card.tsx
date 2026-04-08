import { Heart } from 'lucide-react'
import type { CommentItem } from '@/features/weibo/models/status'
import { MentionInlineText } from '@/features/weibo/components/status-text'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function NestedCommentCard({ comment }: { comment: CommentItem }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={comment.author.name} />
            <AvatarFallback className="text-[10px] font-semibold">
              {comment.author.name?.slice(0, 1).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium">{comment.author.name}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {comment.createdAtLabel || 'Unknown time'}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
        <MentionInlineText text={comment.text || ''} />
      </p>
      {comment.comments.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 border-l border-border/70 pl-2">
          {comment.comments.map((child) => (
            <NestedCommentCard key={child.id} comment={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CommentCard({ item }: { item: CommentItem }) {
  return (
    <Card className="gap-3 rounded-[24px] border-border/70 bg-card/95 py-3 shadow-none">
      <CardHeader className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 px-4">
        <Avatar className="size-10">
          <AvatarImage src={item.author.avatarUrl ?? undefined} alt={item.author.name} />
          <AvatarFallback className="text-xs font-semibold">
            {item.author.name?.slice(0, 1).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle className="truncate text-sm">{item.author.name}</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {item.createdAtLabel || 'Unknown time'}
            </Badge>
          </div>
          {item.source ? (
            <p className="truncate text-[11px] text-muted-foreground">{item.source}</p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          <MentionInlineText text={item.text || ''} />
        </p>

        {item.replyComment ? (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-foreground/80">
              回复 @{item.replyComment.author.name}
            </p>
            <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
              <MentionInlineText text={item.replyComment.text || ''} />
            </p>
          </div>
        ) : null}

        {item.comments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {item.comments.map((child) => (
              <NestedCommentCard key={child.id} comment={child} />
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Heart className="size-3.5" />
          <span>{item.likeCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
