import { useMutation } from '@tanstack/react-query'
import { Bell, BellRing } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import { setSpecialFollowUser } from '@/lib/weibo/services/weibo-repository'

interface SpecialFollowButtonProps {
  uid: string
  following: boolean
  specialFollowing: boolean
  size?: 'icon-sm' | 'icon-lg'
  className?: string
}

export function SpecialFollowButton({
  uid,
  following,
  specialFollowing,
  size = 'icon-lg',
  className,
}: SpecialFollowButtonProps) {
  const currentUid = getCurrentUserUid()
  const isSelf = currentUid !== null && currentUid === uid
  const [optimistic, setOptimistic] = useState<{ uid: string; special: boolean } | null>(null)

  const hasOptimisticState = optimistic?.uid === uid
  const isSpecial = hasOptimisticState ? optimistic.special : specialFollowing
  const label = isSpecial ? '取消特别关注' : '设为特别关注'
  const Icon = isSpecial ? BellRing : Bell

  const mutation = useMutation({
    mutationFn: (nextSpecial: boolean) => setSpecialFollowUser(uid, nextSpecial),
    meta: {
      invalidates: [
        ['weibo', 'profile'],
        ['weibo', 'profile-hover'],
        ['weibo', 'profile', 'groups', uid],
        ['weibo', 'follow-groups'],
      ],
    },
    onMutate: (nextSpecial) => {
      const previous = isSpecial
      setOptimistic({ uid, special: nextSpecial })
      return { previous }
    },
    onSuccess: (_data, nextSpecial) => {
      toast.success(nextSpecial ? '已设为特别关注' : '已取消特别关注')
    },
    onError: (error, _nextSpecial, context) => {
      setOptimistic(context ? { uid, special: context.previous } : null)
      toast.error(error instanceof Error ? error.message : '设置特别关注失败')
    },
  })

  if (!following || isSelf) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size={size}
            aria-label={label}
            aria-pressed={isSpecial}
            title={label}
            disabled={mutation.isPending}
            className={cn(
              isSpecial &&
                'text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200',
              className,
            )}
            onClick={() => mutation.mutate(!isSpecial)}
          >
            <Icon className={cn('size-4', isSpecial && 'fill-current')} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
