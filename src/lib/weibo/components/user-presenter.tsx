import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { FeedAuthor } from '@/lib/weibo/models/feed'

function getAuthorInitial(name: string | null | undefined) {
  return name?.slice(0, 1).toUpperCase() || '?'
}

export function UserAvatar({
  author,
  sizeClassName,
  fallbackClassName,
}: {
  author: FeedAuthor
  sizeClassName: string
  fallbackClassName: string
}) {
  return (
    <Avatar className={sizeClassName}>
      <AvatarImage src={author.avatarUrl ?? undefined} alt={author.name} />
      <AvatarFallback className={fallbackClassName}>{getAuthorInitial(author.name)}</AvatarFallback>
    </Avatar>
  )
}

export function CreatedAtBadge({
  label,
  className,
}: {
  label: string | null | undefined
  className?: string
}) {
  return (
    <Badge variant="secondary" className={className}>
      {label || 'Unknown time'}
    </Badge>
  )
}
