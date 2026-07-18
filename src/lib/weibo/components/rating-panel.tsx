import { useQuery } from '@tanstack/react-query'
import { StarIcon } from 'lucide-react'
import { useState, type FocusEvent } from 'react'

import { Rating } from '@/components/ui/rating'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  myUserRatingQueryOptions,
  useRateUser,
  userRatingCacheOnlyQueryOptions,
  userRatingQueryOptions,
} from '@/lib/weibo/rating/xb-rating'

export interface RatingSummaryBadgeProps {
  /** UID of the user whose public rating is shown. */
  targetUid: string
  size?: 'sm' | 'md'
  className?: string
  /** When true, only read batch-seeded cache (for feed cards). */
  useBatchCache?: boolean
}

export interface RatingPanelProps {
  /** UID of the user being rated. */
  targetUid: string
  /** Size variant. */
  size?: 'sm' | 'md'
  className?: string
}

export function ratingScoreToDisplayStars(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0
  return Math.min(5, Math.ceil(score) / 2)
}

function formatRatingScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return '-'
  return score.toFixed(1)
}

function getRatingSizes(size: 'sm' | 'md') {
  return {
    scoreTextClassName: size === 'sm' ? 'text-[11px]' : 'text-xs',
    labelTextClassName: size === 'sm' ? 'text-[11px]' : 'text-xs',
    starSize: size === 'sm' ? 13 : 15,
    starSlotClassName: size === 'sm' ? 'w-18' : 'w-20',
  }
}

/** Read-only average rating for feed cards (batch summary cache). */
export function RatingSummaryBadge({
  targetUid,
  size = 'sm',
  className,
  useBatchCache = false,
}: RatingSummaryBadgeProps) {
  const summaryQuery = useQuery({
    ...(useBatchCache
      ? userRatingCacheOnlyQueryOptions(targetUid)
      : userRatingQueryOptions(targetUid)),
  })

  const sizes = getRatingSizes(size)
  const averageScore = summaryQuery.isError ? null : (summaryQuery.data?.avg ?? null)
  const averageDisplayScore = formatRatingScore(averageScore)
  const averageDisplayStars = ratingScoreToDisplayStars(averageScore ?? 0)

  return (
    <div
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2 leading-none', className)}
      aria-label={`评分 ${averageDisplayScore} 分`}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={cn('flex shrink-0 items-center', sizes.starSlotClassName)}>
              <Rating
                value={averageDisplayStars}
                max={5}
                size={sizes.starSize}
                precision={0.5}
                readOnly
                aria-label={`评分 ${averageDisplayScore} 分`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span className={cn('font-semibold tabular-nums', sizes.scoreTextClassName)}>
              {averageDisplayScore}
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function RatingPanel({ targetUid, size = 'sm', className }: RatingPanelProps) {
  const [isEditing, setIsEditing] = useState(false)

  const summaryQuery = useQuery({
    ...userRatingQueryOptions(targetUid),
  })

  const myRatingQuery = useQuery({
    ...myUserRatingQueryOptions(targetUid),
  })
  const myStars = myRatingQuery.data?.stars ? myRatingQuery.data.stars : null

  const rateUserMutation = useRateUser()
  const isPending = rateUserMutation.isPending

  const sizes = getRatingSizes(size)
  const averageScore = summaryQuery.isError ? null : (summaryQuery.data?.avg ?? 0)
  const averageDisplayScore = formatRatingScore(averageScore)
  const averageDisplayStars = ratingScoreToDisplayStars(averageScore ?? 0)
  const displayedStars = isEditing ? (myStars ?? 0) : averageDisplayStars

  const handleRate = (stars: number) => {
    if (stars < 1 || stars > 5 || !Number.isInteger(stars)) return
    rateUserMutation.mutate({ targetUid, stars })
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'border-border/70 bg-muted/30 inline-flex h-8 items-center gap-2 rounded-md border px-2.5 leading-none',
        className,
      )}
      aria-label={`rating ${averageDisplayScore} 分，我评分 ${myStars} stars`}
    >
      <div
        className={cn('flex shrink-0 items-center', sizes.starSlotClassName)}
        onBlur={handleBlur}
        onFocus={() => setIsEditing(true)}
        onMouseEnter={() => setIsEditing(true)}
        onMouseLeave={() => setIsEditing(false)}
        aria-label="rating star control"
      >
        {isEditing ? (
          <Rating
            value={myStars ?? 0}
            max={5}
            size={sizes.starSize}
            precision={1}
            onValueChange={handleRate}
            disabled={isPending}
            aria-label="我的 rating"
          />
        ) : (
          <Rating
            value={displayedStars}
            max={5}
            size={sizes.starSize}
            precision={0.5}
            readOnly
            aria-label={`rating ${averageDisplayScore} 分`}
          />
        )}
      </div>
      <span className={cn('font-semibold tabular-nums', sizes.scoreTextClassName)}>
        {averageDisplayScore}
      </span>
      <span className="bg-border h-3 w-px shrink-0" aria-hidden="true" />
      <span className={cn('text-muted-foreground shrink-0 font-medium', sizes.labelTextClassName)}>
        我评
      </span>
      <span className={cn('tabular-nums flex items-center gap-1', sizes.scoreTextClassName)}>
        <StarIcon className="text-foreground size-3 fill-current" />
        {myStars ?? '?'}
      </span>
    </div>
  )
}
