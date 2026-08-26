import { cn } from 'cn'

import { ButtonGroup } from '@/components/ui/button-group'
import { FollowButton } from '@/lib/weibo/components/follow-button'
import { ProfileGroupButton } from '@/lib/weibo/components/profile-group-button'
import { SpecialFollowButton } from '@/lib/weibo/components/special-follow-button'

interface FollowGroupProps {
  uid: string
  following: boolean
  followMe: boolean
  specialFollowing: boolean
  size?: 'sm' | 'lg'
  className?: string
}

export function FollowGroup({
  uid,
  following,
  followMe,
  specialFollowing,
  size = 'sm',
  className,
}: FollowGroupProps) {
  const followSize = size === 'lg' ? 'lg' : 'sm'
  const iconSize = size === 'lg' ? 'icon-lg' : 'icon-sm'

  return (
    <ButtonGroup className={cn(className, '-space-x-0.5')}>
      <FollowButton uid={uid} following={following} followMe={followMe} size={followSize} />
      <SpecialFollowButton
        uid={uid}
        following={following}
        specialFollowing={specialFollowing}
        size={iconSize}
      />
      <ProfileGroupButton uid={uid} following={following} size={iconSize} />
    </ButtonGroup>
  )
}
