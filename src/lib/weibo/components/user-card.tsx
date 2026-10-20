import { BadgeCheck } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { FollowButton } from '@/lib/weibo/components/follow-button'
import { formatProfileCount } from '@/lib/weibo/components/profile-shared'
import type { RelationUser } from '@/lib/weibo/models/user-relation'

interface UserCardProps {
  user: RelationUser
  showFollowButton?: boolean
}

export function UserCard({ user, showFollowButton = true }: UserCardProps) {
  const runtime = usePageRuntime()

  return (
    <Card
      className="hover:bg-accent/30 cursor-pointer transition-colors"
      onClick={() => runtime.navigate(`/u/${user.id}`)}
    >
      <CardContent className="flex items-start gap-3">
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={user.avatarLarge} alt={user.name} />
          <AvatarFallback className="text-sm font-semibold">
            {user.name?.slice(0, 1).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            {user.verified && <BadgeCheck className="size-4 shrink-0 fill-blue-500 text-white" />}
            <span className="text-muted-foreground shrink-0 text-xs">@{user.screenName}</span>
          </div>

          {user.description ? (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {user.description}
            </p>
          ) : null}

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span>
              <span className="text-foreground font-medium tabular-nums">
                {formatProfileCount(user.followersCount)}
              </span>{' '}
              粉丝
            </span>
            {user.location ? <span className="truncate">{user.location}</span> : null}
          </div>
        </div>

        {showFollowButton && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <FollowButton
              uid={user.id}
              following={user.following}
              followMe={user.followMe}
              size="sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
