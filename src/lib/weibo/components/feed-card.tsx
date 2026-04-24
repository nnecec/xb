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
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { StatusText } from '@/lib/weibo/components/status-text'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import { useFeedLongText } from '@/lib/weibo/hooks/use-feed-long-text'
import { useFontSettings } from '@/lib/weibo/hooks/use-font-settings'
import type { FeedItem } from '@/lib/weibo/models/feed'
import {
  type StatusFeedSurface,
  statusAllowsCardNavigate,
} from '@/lib/weibo/models/status-presentation'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import {
  cancelStatusLike,
  createFavorite,
  deleteWeiboStatus,
  destroyFavorite,
  setStatusLike,
} from '@/lib/weibo/services/weibo-repository'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

import { AudioPlayerComponent } from './audio-player'
import { LivePlayer } from './live-player'
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

  if (item.media.type === 'audio') {
    return (
      <div
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <AudioPlayerComponent src={item.media.streamUrl} />
      </div>
    )
  }

  if (item.media.type === 'live') {
    return (
      <div
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <AspectRatio ratio={16 / 9}>
          <LivePlayer
            streamUrl={item.media.streamUrl}
            coverUrl={item.media.coverUrl ?? ''}
            liveStatus={item.media.liveStatus ?? 0}
            replayUrl={item.media.replayUrl}
          />
        </AspectRatio>
      </div>
    )
  }

  return (
    <div
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <AspectRatio ratio={item.media.videoOrientation === 'vertical' ? 1 / 1 : 16 / 9}>
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
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2">
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
              <p className="text-foreground truncate text-sm font-medium hover:underline">
                {item.author.name}
              </p>
            </button>
          </UserHoverCard>
          <CreatedAtBadge label={item.createdAtLabel} />
        </div>
        <p className="text-muted-foreground text-xs">
          {item.source ? `${item.source}` : ''} {item.regionName ? `${item.regionName}` : ''}
        </p>
      </div>
    </div>
  )
}

function FeedTextBlock({
  item,
  canLoadLongText,
  isLongTextLoading,
  hasLongTextError,
  onLoadLongText,
}: {
  item: FeedItem
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
      <StatusText item={item} text={item.text} />

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
    <div className="text-muted-foreground grid w-full grid-cols-3 gap-2 text-xs">
      <Button
        type="button"
        variant="ghost"
        aria-label="回复微博"
        className="group h-auto rounded-full py-2 font-normal hover:bg-sky-50 hover:text-sky-500"
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
        variant="ghost"
        aria-label="转发微博"
        className="group h-auto rounded-full py-2 font-normal hover:bg-emerald-50 hover:text-emerald-500"
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
        variant="ghost"
        aria-label={liked ? '取消点赞' : '点赞微博'}
        aria-pressed={liked}
        disabled={likePending}
        className="group h-auto rounded-full py-2 font-normal hover:bg-rose-50 hover:text-rose-500"
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
    resolvedItem,
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
    onNavigate(resolvedItem)
  }

  return (
    <Card className="cursor-pointer gap-3 py-4" onClick={handleRetweetedClick}>
      <CardHeader>
        <RetweetedAuthorHeader item={resolvedItem} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FeedTextBlock
          item={resolvedItem}
          canLoadLongText={shouldShowLoadLongText}
          isLongTextLoading={isLongTextLoading}
          hasLongTextError={hasLongTextError}
          onLoadLongText={onLoadLongText}
        />

        <FeedMediaBlock item={resolvedItem} />

        <ImageCarousel images={resolvedItem.images} />

        <FeedActions
          item={resolvedItem}
          onLikeClick={onLikeClick}
          likePending={likePendingForId === resolvedItem.id}
        />
      </CardContent>
    </Card>
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
    resolvedItem,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === resolvedItem.author.id

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

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (resolvedItem.favorited) {
        await destroyFavorite(resolvedItem.id)
        toast.success('取消收藏成功')
      } else {
        await createFavorite(resolvedItem.id)
        toast.success('收藏成功')
      }
    },
    meta: {
      invalidates: [['weibo']],
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
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

    onNavigate(resolvedItem)
  }

  return (
    <Card
      className={cn('gap-4 py-4 relative cursor-pointer', className)}
      data-testid="feed-card-body"
      onClick={handleCardClick}
    >
      <FeedCardMoreMenu
        type="status"
        isOwner={showOwnerMenu}
        item={resolvedItem}
        favorited={resolvedItem.favorited}
        onFavorite={() => favoriteMutation.mutateAsync()}
        contentLabel="这条微博"
        isDeleting={deleteMutation.isPending}
        onDelete={() => deleteMutation.mutateAsync()}
        className="absolute top-4 right-4"
      />
      {resolvedItem.title ? (
        <div className="px-4">
          <Badge variant="secondary">{resolvedItem.title.text}</Badge>
        </div>
      ) : null}
      <FeedAuthorHeader item={resolvedItem} />
      <CardContent
        className="flex flex-col gap-4"
        onMouseDown={handleCardMouseDown}
        onMouseUp={handleCardMouseUp}
      >
        <FeedTextBlock
          item={resolvedItem}
          canLoadLongText={shouldShowLoadLongText}
          isLongTextLoading={isLongTextLoading}
          hasLongTextError={hasLongTextError}
          onLoadLongText={onLoadLongText}
        />

        <FeedMediaBlock item={resolvedItem} />

        <ImageCarousel images={resolvedItem.images} />

        {resolvedItem.retweetedStatus ? (
          <RetweetedFeedBlock
            item={resolvedItem.retweetedStatus}
            onNavigate={onNavigate}
            onLikeClick={(target) => likeMutation.mutate(target)}
            likePendingForId={likePendingId}
          />
        ) : null}
      </CardContent>
      <CardFooter>
        <FeedActions
          item={resolvedItem}
          onCommentClick={onCommentClick}
          onRepostClick={onRepostClick}
          onLikeClick={(target) => likeMutation.mutate(target)}
          likePending={likePendingId === resolvedItem.id}
        />
      </CardFooter>
    </Card>
  )
}
