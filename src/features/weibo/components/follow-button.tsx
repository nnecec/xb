import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { followUser, unfollowUser } from '@/features/weibo/services/weibo-repository'

interface FollowButtonProps {
  uid: string
  following: boolean
  followMe: boolean
  onFollowingChange?: (following: boolean, followMe: boolean) => void
  size?: 'sm' | 'default'
  className?: string
}

export function FollowButton({
  uid,
  following,
  followMe,
  onFollowingChange,
  size = 'sm',
  className,
}: FollowButtonProps) {
  const followMutation = useMutation({
    mutationFn: () => followUser(uid),
    onSuccess: (data) => {
      onFollowingChange?.(data.following, data.followMe)
    },
    meta: {
      invalidates: [
        ['weibo', 'profile'],
        ['weibo', 'profile-hover'],
      ],
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(uid),
    onSuccess: (data) => {
      onFollowingChange?.(data.following, data.followMe)
    },
    meta: {
      invalidates: [
        ['weibo', 'profile'],
        ['weibo', 'profile-hover'],
      ],
    },
  })

  const isLoading = followMutation.isPending || unfollowMutation.isPending

  const handleClick = () => {
    if (following) {
      unfollowMutation.mutate()
    } else {
      followMutation.mutate()
    }
  }

  if (following) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isLoading}
      >
        {followMe ? '互相关注' : '正在关注'}
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {followMe ? '回关' : '关注'}
    </Button>
  )
}
