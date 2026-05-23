import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { memo, useCallback, type MouseEvent, type ReactNode, useRef } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { StatusText } from '@/lib/weibo/components/status-text'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
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

import { AudioPlayerComponent } from './media-player/audio-player'
import { LivePlayer } from './media-player/live-player'
import { VideoPlayer } from './media-player/video-player'

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
  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(item)
  }, [item])

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
      <AspectRatio ratio={item.media.videoOrientation === 'vertical' ? 4 / 3 : 16 / 9}>
        <VideoPlayer
          progressiveSrc={item.media.streamUrl}
          poster={item.media.coverUrl ?? undefined}
          dash={item.media.dash}
          downloadUrl={item.media.downloadUrl}
          downloadFilename={`${item.author.name} ${item.text.slice(0, 15).replaceAll(/[\\/:*?"<>|]/g, '_')}`}
          onPlay={addEntry}
        />
      </AspectRatio>
    </div>
  )
}

type ProfileLookup = { uid: string } | { screenName: string }

function FeedAuthorHeader({
  item,
  onNavigateProfile,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
  trailing?: ReactNode
  onNavigateProfile?: (lookup: ProfileLookup) => void
}) {
  const handleAuthorClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (onNavigateProfile) {
      onNavigateProfile({ uid: item.author.id })
    }
  }

  return (
    <CardHeader className="flex flex-row gap-3 px-4">
      <UserHoverCard uid={item.author.id}>
        <button type="button" onClick={handleAuthorClick} className="cursor-pointer">
          <UserAvatar
            author={item.author}
            sizeClassName="size-12"
            fallbackClassName="text-sm font-semibold"
          />
        </button>
      </UserHoverCard>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserHoverCard uid={item.author.id}>
                <button
                  type="button"
                  onClick={handleAuthorClick}
                  className="cursor-pointer text-left"
                >
                  <CardTitle className="truncate text-base hover:underline">
                    {item.author.name}
                  </CardTitle>
                </button>
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
  const isDeletedAuthor = !item.author.id

  if (isDeletedAuthor) {
    return <div className="text-muted-foreground text-sm">未知用户</div>
  }

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
  const { fontSizeClass, fontWeightClass, letterSpacingClass, lineHeightClass, fontFamilyClass } =
    useFontSettings()

  return (
    <div
      className={cn(
        'whitespace-pre-wrap text-foreground',
        fontSizeClass,
        fontWeightClass,
        letterSpacingClass,
        lineHeightClass,
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
  xLayoutEnabled,
  favorited,
  onFavorite,
  favoritePending,
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePending?: boolean
  xLayoutEnabled: boolean
  favorited?: boolean
  onFavorite?: () => void | Promise<void>
  favoritePending?: boolean
}) {
  const liked = item.liked === true
  const isBookmarked = favorited === true

  const weiboUrl = `https://weibo.com/${item.author.id}/${item.mblogId}`

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(weiboUrl).then(() => {
      toast.success('已复制链接')
    })
  }
  const CommentButton = (
    <Button
      type="button"
      variant="ghost"
      aria-label="回复微博"
      className="group h-auto rounded-full py-2 font-normal transition-transform hover:bg-sky-50 hover:text-sky-500 active:scale-[0.96]"
      onClick={(event) => {
        event.stopPropagation()
        onCommentClick?.(item)
      }}
    >
      <MessageCircle className="size-3.5 transition-colors group-hover:text-sky-500" />
      <span className="tabular-nums transition-colors group-hover:text-sky-500">
        {formatWeiboCount(item.stats.comments)}
      </span>
    </Button>
  )
  const RepostButton = (
    <Button
      type="button"
      variant="ghost"
      aria-label="转发微博"
      className="group h-auto rounded-full py-2 font-normal transition-transform hover:bg-emerald-50 hover:text-emerald-500 active:scale-[0.96]"
      onClick={(event) => {
        event.stopPropagation()
        onRepostClick?.(item)
      }}
    >
      <Repeat2 className="size-3.5 transition-colors group-hover:text-emerald-500" />
      <span className="tabular-nums transition-colors group-hover:text-emerald-500">
        {formatWeiboCount(item.stats.reposts)}
      </span>
    </Button>
  )
  const LikeButton = (
    <Button
      type="button"
      variant="ghost"
      aria-label={liked ? '取消点赞' : '点赞微博'}
      aria-pressed={liked}
      disabled={likePending}
      className="group h-auto rounded-full py-2 font-normal transition-transform hover:bg-rose-50 hover:text-rose-500 active:scale-[0.96]"
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
        className={cn(
          'tabular-nums transition-colors group-hover:text-rose-500',
          liked && 'text-rose-500',
        )}
      >
        {formatWeiboCount(item.stats.likes)}
      </span>
    </Button>
  )

  if (xLayoutEnabled) {
    return (
      <div className="text-muted-foreground grid w-full grid-cols-4 gap-2 text-xs">
        {CommentButton}
        {RepostButton}
        {LikeButton}
        <div className="flex h-full items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            aria-label={isBookmarked ? '取消收藏' : '收藏'}
            aria-pressed={isBookmarked}
            disabled={favoritePending}
            className="group h-auto rounded-full py-2 font-normal transition-transform hover:bg-amber-50 hover:text-amber-500 active:scale-[0.96]"
            onClick={(event) => {
              event.stopPropagation()
              onFavorite?.()
            }}
          >
            <Bookmark
              className={cn(
                'size-3.5 transition-colors group-hover:text-amber-500',
                isBookmarked && 'fill-amber-500 text-amber-500',
              )}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label="分享"
                className="group h-auto rounded-full py-2 font-normal transition-transform hover:bg-violet-50 hover:text-violet-500 active:scale-[0.96]"
                onClick={(event) => event.stopPropagation()}
              >
                <Share className="size-3.5 transition-colors group-hover:text-violet-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => event.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onSelect={handleCopyLink}>复制链接</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="text-muted-foreground grid w-full grid-cols-3 gap-2 text-xs">
      {RepostButton}
      {CommentButton}
      {LikeButton}
    </div>
  )
}

function RetweetedFeedBlock({
  item,
  onNavigate,
  onLikeClick,
  likePendingForId,
  xLayoutEnabled,
  onFavorite,
  favoritePendingForId,
}: {
  item: NonNullable<FeedItem['retweetedStatus']>
  onNavigate?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePendingForId: string | null
  xLayoutEnabled: boolean
  onFavorite?: (target: FeedItem) => void | Promise<void>
  favoritePendingForId: string | null
}) {
  const {
    resolvedItem,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(resolvedItem)
  }, [resolvedItem])

  const isDeletedAuthor = !resolvedItem.author.id

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
    <Card
      className={cn('gap-3 py-4', onNavigate && 'cursor-pointer')}
      onClick={handleRetweetedClick}
    >
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

        <ImageCarousel
          images={resolvedItem.images}
          mixMediaItems={resolvedItem.mixMediaInfo}
          onOpen={addEntry}
        />

        {!isDeletedAuthor && (
          <FeedActions
            item={resolvedItem}
            onLikeClick={onLikeClick}
            likePending={likePendingForId === resolvedItem.id}
            xLayoutEnabled={xLayoutEnabled}
            favorited={resolvedItem.favorited}
            onFavorite={onFavorite ? () => onFavorite(resolvedItem) : undefined}
            favoritePending={favoritePendingForId === resolvedItem.id}
          />
        )}
      </CardContent>
    </Card>
  )
}

export const FeedCard = memo(function FeedCard({
  item,
  surface: surfaceProp = 'timeline',
  onNavigate,
  onCommentClick,
  onRepostClick,
  onNavigateProfile,
  onStatusDeleted,
  className,
  uniformHeight,
}: {
  item: FeedItem
  surface?: StatusFeedSurface
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onNavigateProfile?: (lookup: ProfileLookup) => void
  /** After deleting this status (owner only), e.g. navigate back from detail. */
  onStatusDeleted?: () => void
  className?: string
  uniformHeight?: boolean
}) {
  const xLayoutEnabled = useAppSettings((s) => s.xLayoutEnabled)
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
  const queryClient = useQueryClient()

  const likeMutation = useMutation({
    mutationFn: async (target: FeedItem) => {
      if (target.liked) {
        await cancelStatusLike(target.id)
      } else {
        await setStatusLike(target.id)
      }
    },
    onMutate: (target: FeedItem) => {
      queryClient.cancelQueries({ queryKey: ['weibo'] })

      const previousItems = queryClient.getQueriesData({ queryKey: ['weibo'] })

      queryClient.setQueriesData({ queryKey: ['weibo'] }, (old) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old
        const data = old as { pages: { items: FeedItem[] }[] }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id === target.id) {
                return {
                  ...item,
                  liked: !item.liked,
                  stats: {
                    ...item.stats,
                    likes: item.stats.likes + (item.liked ? -1 : 1),
                  },
                }
              }
              if (item.retweetedStatus?.id === target.id) {
                return {
                  ...item,
                  retweetedStatus: {
                    ...item.retweetedStatus,
                    liked: !item.retweetedStatus.liked,
                    stats: {
                      ...item.retweetedStatus.stats,
                      likes:
                        item.retweetedStatus.stats.likes + (item.retweetedStatus.liked ? -1 : 1),
                    },
                  },
                }
              }
              return item
            }),
          })),
        }
      })

      for (const key of queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey)) {
        if (!Array.isArray(key)) continue
        if (key[0] !== 'weibo' || key[1] !== 'status') continue
        const cached = queryClient.getQueryData(key)
        if (!cached || typeof cached !== 'object') continue
        const detail = cached as { status?: FeedItem }
        if (detail.status && detail.status.id === target.id) {
          queryClient.setQueryData(key, {
            ...detail,
            status: {
              ...detail.status,
              liked: !detail.status.liked,
              stats: {
                ...detail.status.stats,
                likes: detail.status.stats.likes + (detail.status.liked ? -1 : 1),
              },
            },
          })
        }
      }

      return { previousItems }
    },
    onError: (_error, _target, context) => {
      // Rollback on error
      if (context?.previousItems) {
        for (const [queryKey, data] of context.previousItems) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error(_error instanceof Error ? _error.message : '操作失败')
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
    mutationFn: async (target: FeedItem) => {
      if (target.favorited) {
        await destroyFavorite(target.id)
      } else {
        await createFavorite(target.id)
      }
    },
    onMutate: (target: FeedItem) => {
      queryClient.cancelQueries({ queryKey: ['weibo'] })

      const previousItems = queryClient.getQueriesData({ queryKey: ['weibo'] })

      queryClient.setQueriesData({ queryKey: ['weibo'] }, (old) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old
        const data = old as { pages: { items: FeedItem[] }[] }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id === target.id) {
                return { ...item, favorited: !item.favorited }
              }
              if (item.retweetedStatus?.id === target.id) {
                return {
                  ...item,
                  retweetedStatus: {
                    ...item.retweetedStatus,
                    favorited: !item.retweetedStatus.favorited,
                  },
                }
              }
              return item
            }),
          })),
        }
      })

      for (const key of queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey)) {
        if (!Array.isArray(key)) continue
        if (key[0] !== 'weibo' || key[1] !== 'status') continue
        const cached = queryClient.getQueryData(key)
        if (!cached || typeof cached !== 'object') continue
        const detail = cached as { status?: FeedItem }
        if (detail.status && detail.status.id === target.id) {
          queryClient.setQueryData(key, {
            ...detail,
            status: { ...detail.status, favorited: !detail.status.favorited },
          })
        }
      }

      return { previousItems }
    },
    onSuccess: (_data, target) => {
      toast.success(target.favorited ? '取消收藏成功' : '收藏成功')
    },
    onError: (_error, target, context) => {
      if (context?.previousItems) {
        for (const [queryKey, data] of context.previousItems) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error(_error instanceof Error ? _error.message : '操作失败')
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

  const canNavigate = onNavigate && statusAllowsCardNavigate(surfaceProp, 'root')

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (!canNavigate) {
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

  const cardContentElement = (
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

      <ImageCarousel images={resolvedItem.images} mixMediaItems={resolvedItem.mixMediaInfo} />

      {resolvedItem.retweetedStatus ? (
        <RetweetedFeedBlock
          item={resolvedItem.retweetedStatus}
          onNavigate={onNavigate}
          onLikeClick={(target) => likeMutation.mutate(target)}
          likePendingForId={likePendingId}
          xLayoutEnabled={xLayoutEnabled}
          onFavorite={(target) => favoriteMutation.mutate(target)}
          favoritePendingForId={favoriteMutation.isPending ? resolvedItem.retweetedStatus.id : null}
        />
      ) : null}
    </CardContent>
  )

  return (
    <Card
      className={cn(
        'py-4 relative',
        uniformHeight ? 'gap-0 flex-1' : 'gap-4',
        canNavigate && 'cursor-pointer',
        className,
      )}
      data-testid="feed-card-body"
      onClick={handleCardClick}
    >
      <FeedCardMoreMenu
        type="status"
        isOwner={showOwnerMenu}
        item={resolvedItem}
        favorited={resolvedItem.favorited}
        onFavorite={() => favoriteMutation.mutateAsync(resolvedItem)}
        contentLabel="这条微博"
        isDeleting={deleteMutation.isPending}
        onDelete={() => deleteMutation.mutateAsync()}
        className="absolute top-4 right-4"
        xLayoutEnabled={xLayoutEnabled}
      />
      {resolvedItem.title ? (
        <div className={cn('px-4', uniformHeight && 'mb-4')}>
          <Badge variant="secondary">{resolvedItem.title.text}</Badge>
        </div>
      ) : null}
      {uniformHeight ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-0">
          <FeedAuthorHeader item={resolvedItem} onNavigateProfile={onNavigateProfile} />
          {cardContentElement}
          <div className="flex-1" />
        </div>
      ) : (
        <>
          <FeedAuthorHeader item={resolvedItem} onNavigateProfile={onNavigateProfile} />
          {cardContentElement}
        </>
      )}
      <CardFooter className={cn(uniformHeight && 'mt-4 shrink-0')}>
        <FeedActions
          item={resolvedItem}
          onCommentClick={onCommentClick}
          onRepostClick={onRepostClick}
          onLikeClick={(target) => likeMutation.mutate(target)}
          likePending={likePendingId === resolvedItem.id}
          xLayoutEnabled={xLayoutEnabled}
          favorited={resolvedItem.favorited}
          onFavorite={() => favoriteMutation.mutateAsync(resolvedItem)}
          favoritePending={favoriteMutation.isPending}
        />
      </CardFooter>
    </Card>
  )
})
