import { useMutation } from '@tanstack/react-query'
import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { type MouseEvent, type ReactNode, useRef } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { OwnContentMoreMenu } from '@/features/weibo/components/own-content-more-menu'
import { StatusText } from '@/features/weibo/components/status-text'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import { useFeedLongText } from '@/features/weibo/hooks/use-feed-long-text'
import { useFontSettings } from '@/features/weibo/hooks/use-font-settings'
import type { FeedItem } from '@/features/weibo/models/feed'
import {
  type StatusFeedSurface,
  statusAllowsCardNavigate,
} from '@/features/weibo/models/status-presentation'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import {
  cancelStatusLike,
  deleteWeiboStatus,
  setStatusLike,
} from '@/features/weibo/services/weibo-repository'
import { formatWeiboCount } from '@/features/weibo/utils/format-weibo-count'
import { cn } from '@/lib/utils'

import { VideoPlayer } from './video-player'

function hasTextSelectionWithin(container: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  const commonAncestor = range.commonAncestorContainer
  return commonAncestor === container || container.contains(commonAncestor)
}

function FeedMediaBlock({ item }: { item: FeedItem }) {
  if (!item.media) {
    return null
  }

  return item.media.type === 'audio' ? (
    <div
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <audio controls src={item.media.streamUrl} className="w-full" />
    </div>
  ) : (
    <div
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <AspectRatio ratio={16 / 9}>
        <VideoPlayer
          progressiveSrc={item.media.streamUrl}
          poster={item.media.coverUrl ?? undefined}
          dash={item.media.dash}
        />
      </AspectRatio>
    </div>
  )
}

function FeedAuthorHeader({
  item,
  trailing,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
  trailing?: ReactNode
}) {
  return (
    <CardHeader className="flex flex-row gap-3 px-4">
      <UserHoverCard uid={item.author.id}>
        <Link
          to={`/n/${encodeURIComponent(item.author.name)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <UserAvatar
            author={item.author}
            sizeClassName="size-12"
            fallbackClassName="text-sm font-semibold"
          />
        </Link>
      </UserHoverCard>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserHoverCard uid={item.author.id}>
                <Link
                  to={`/n/${encodeURIComponent(item.author.name)}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <CardTitle className="truncate text-base hover:underline">
                    {item.author.name}
                  </CardTitle>
                </Link>
              </UserHoverCard>
              <CreatedAtBadge label={item.createdAtLabel} />
            </div>
            <CardDescription className="text-xs">
              {item.source ? `${item.source}` : ''} {item.regionName ? `${item.regionName}` : ''}
            </CardDescription>
          </div>
          {trailing ? <div className="shrink-0 pt-0.5">{trailing}</div> : null}
        </div>
      </div>
    </CardHeader>
  )
}

function RetweetedAuthorHeader({
  item,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
}) {
  return (
    <div className="mb-3 grid grid-cols-[36px_minmax(0,1fr)] gap-2">
      <UserHoverCard uid={item.author.id}>
        <button
          type="button"
          className="cursor-pointer"
          onClick={(event) => event.stopPropagation()}
        >
          <UserAvatar
            author={item.author}
            sizeClassName="size-9"
            fallbackClassName="text-xs font-semibold"
          />
        </button>
      </UserHoverCard>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <UserHoverCard uid={item.author.id}>
            <button
              type="button"
              className="cursor-pointer text-left"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="truncate text-sm font-medium text-foreground hover:underline">
                {item.author.name}
              </p>
            </button>
          </UserHoverCard>
          <CreatedAtBadge label={item.createdAtLabel} />
        </div>
        <p className="text-xs text-muted-foreground">
          {item.source ? `${item.source}` : ''} {item.regionName ? `${item.regionName}` : ''}
        </p>
      </div>
    </div>
  )
}

function FeedTextBlock({
  item,
  text,
  canLoadLongText,
  isLongTextLoading,
  hasLongTextError,
  onLoadLongText,
}: {
  item: FeedItem
  text: string
  canLoadLongText: boolean
  isLongTextLoading: boolean
  hasLongTextError: boolean
  onLoadLongText: () => void
}) {
  const { fontSizeClass, fontFamilyClass } = useFontSettings()

  return (
    <div
      className={cn(
        'whitespace-pre-wrap leading-6 text-foreground',
        fontSizeClass,
        fontFamilyClass,
      )}
    >
      <StatusText item={item} text={text} />

      {canLoadLongText ? (
        <Button
          className="inline-flex"
          size="xs"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation()
            onLoadLongText()
          }}
          disabled={isLongTextLoading}
        >
          {isLongTextLoading ? '加载中...' : hasLongTextError ? '重试全文' : '全文'}
        </Button>
      ) : null}
    </div>
  )
}

function FeedActions({
  item,
  onCommentClick,
  onRepostClick,
  onLikeClick,
  likePending,
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePending?: boolean
}) {
  const liked = item.liked === true

  return (
    <div className="grid w-full grid-cols-3 gap-2 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="secondary"
        aria-label="回复微博"
        className="group h-auto rounded-full bg-muted py-2 font-normal hover:bg-sky-50 hover:text-sky-500"
        onClick={(event) => {
          event.stopPropagation()
          onCommentClick?.(item)
        }}
      >
        <MessageCircle className="size-3.5 transition-colors group-hover:text-sky-500" />
        <span className="transition-colors group-hover:text-sky-500">
          {formatWeiboCount(item.stats.comments)}
        </span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        aria-label="转发微博"
        className="group h-auto rounded-full bg-muted py-2 font-normal hover:bg-emerald-50 hover:text-emerald-500"
        onClick={(event) => {
          event.stopPropagation()
          onRepostClick?.(item)
        }}
      >
        <Repeat2 className="size-3.5 transition-colors group-hover:text-emerald-500" />
        <span className="transition-colors group-hover:text-emerald-500">
          {formatWeiboCount(item.stats.reposts)}
        </span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        aria-label={liked ? '取消点赞' : '点赞微博'}
        aria-pressed={liked}
        disabled={likePending}
        className="group h-auto rounded-full bg-muted py-2 font-normal hover:bg-rose-50 hover:text-rose-500"
        onClick={(event) => {
          event.stopPropagation()
          onLikeClick?.(item)
        }}
      >
        <Heart
          className={cn(
            'size-3.5 transition-colors group-hover:text-rose-500',
            liked && 'fill-rose-500 text-rose-500',
          )}
        />
        <span
          className={cn('transition-colors group-hover:text-rose-500', liked && 'text-rose-500')}
        >
          {formatWeiboCount(item.stats.likes)}
        </span>
      </Button>
    </div>
  )
}

function RetweetedFeedBlock({
  item,
  onNavigate,
  onLikeClick,
  likePendingForId,
}: {
  item: NonNullable<FeedItem['retweetedStatus']>
  onNavigate?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePendingForId: string | null
}) {
  const {
    resolvedText,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  const handleRetweetedClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!onNavigate) {
      return
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    onNavigate(item)
  }

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 border border-border/70 bg-muted/40 p-3"
      onClick={handleRetweetedClick}
    >
      <RetweetedAuthorHeader item={item} />
      <FeedTextBlock
        item={item}
        text={resolvedText}
        canLoadLongText={shouldShowLoadLongText}
        isLongTextLoading={isLongTextLoading}
        hasLongTextError={hasLongTextError}
        onLoadLongText={onLoadLongText}
      />

      <FeedMediaBlock item={item} />

      <ImageCarousel images={item.images} />

      <FeedActions
        item={item}
        onLikeClick={onLikeClick}
        likePending={likePendingForId === item.id}
      />
    </div>
  )
}

export function FeedCard({
  item,
  surface: surfaceProp = 'timeline',
  onNavigate,
  onCommentClick,
  onRepostClick,
  onStatusDeleted,
  className,
}: {
  item: FeedItem
  surface?: StatusFeedSurface
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  /** After deleting this status (owner only), e.g. navigate back from detail. */
  onStatusDeleted?: () => void
  className?: string
}) {
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const {
    resolvedText,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === item.author.id

  const likeMutation = useMutation({
    mutationFn: async (target: FeedItem) => {
      if (target.liked) {
        await cancelStatusLike(target.id)
      } else {
        await setStatusLike(target.id)
      }
    },
    meta: {
      invalidates: [['weibo']],
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWeiboStatus(item.id),
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: () => {
      toast.success('已删除')
      onStatusDeleted?.()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const likePendingId =
    likeMutation.isPending && likeMutation.variables ? likeMutation.variables.id : null

  const handleCardMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      pointerDownPositionRef.current = null
      return
    }

    suppressNextClickRef.current = false
    pointerDownPositionRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleCardMouseUp = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || !pointerDownPositionRef.current) {
      return
    }

    const deltaX = event.clientX - pointerDownPositionRef.current.x
    const deltaY = event.clientY - pointerDownPositionRef.current.y
    suppressNextClickRef.current = Math.hypot(deltaX, deltaY) > 4
    pointerDownPositionRef.current = null
  }

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (!onNavigate || !statusAllowsCardNavigate(surfaceProp, 'root')) {
      return
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('a,button,[role="button"],input,textarea,select,label')) {
      return
    }

    if (hasTextSelectionWithin(event.currentTarget)) {
      return
    }

    onNavigate(item)
  }

  return (
    <Card className={cn('gap-4', className)} data-testid="feed-card-body">
      {item.title ? (
        <div className="px-4">
          <Badge variant="secondary">{item.title.text}</Badge>
        </div>
      ) : null}
      <FeedAuthorHeader
        item={item}
        trailing={
          showOwnerMenu ? (
            <OwnContentMoreMenu
              contentLabel="这条微博"
              isDeleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutateAsync()}
            />
          ) : null
        }
      />
      <CardContent
        className="flex cursor-pointer flex-col gap-4"
        onClick={handleCardClick}
        onMouseDown={handleCardMouseDown}
        onMouseUp={handleCardMouseUp}
      >
        <FeedTextBlock
          item={item}
          text={resolvedText}
          canLoadLongText={shouldShowLoadLongText}
          isLongTextLoading={isLongTextLoading}
          hasLongTextError={hasLongTextError}
          onLoadLongText={onLoadLongText}
        />

        <FeedMediaBlock item={item} />

        <ImageCarousel images={item.images} />

        {item.retweetedStatus ? (
          <RetweetedFeedBlock
            item={item.retweetedStatus}
            onNavigate={onNavigate}
            onLikeClick={(target) => likeMutation.mutate(target)}
            likePendingForId={likePendingId}
          />
        ) : null}
      </CardContent>
      <CardFooter>
        <FeedActions
          item={item}
          onCommentClick={onCommentClick}
          onRepostClick={onRepostClick}
          onLikeClick={(target) => likeMutation.mutate(target)}
          likePending={likePendingId === item.id}
        />
      </CardFooter>
    </Card>
  )
}
