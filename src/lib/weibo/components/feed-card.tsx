import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import {
  useCallback,
  memo,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { FEED_TOOLBAR_BUTTON_IDS } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { FeedCommentsExpanded } from '@/lib/weibo/components/feed-comments-expanded'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { RatingSummaryBadge } from '@/lib/weibo/components/rating-panel'
import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import {
  cancelStatusLike,
  createFavorite,
  deleteWeiboStatus,
  destroyFavorite,
  setStatusLike,
} from '@/lib/weibo/data/weibo-data'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import { useFeedLongText } from '@/lib/weibo/hooks/use-feed-long-text'
import { useHasEnteredViewport } from '@/lib/weibo/hooks/use-has-entered-viewport'
import type { FeedItem } from '@/lib/weibo/models/feed'
import {
  type StatusFeedSurface,
  statusAllowsCardNavigate,
} from '@/lib/weibo/models/status-presentation'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import {
  optimisticallyRemoveStatusFromFavorites,
  optimisticallyToggleStatusFavorite,
  optimisticallyToggleStatusLike,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'

import { FeedActions } from './feed-card/feed-card-actions'
import { FeedAuthorHeader } from './feed-card/feed-card-author'
import { FeedMediaBlock } from './feed-card/feed-card-media'
import { RetweetedFeedBlock } from './feed-card/feed-card-retweeted'
import { FeedTextBlock } from './feed-card/feed-card-text'
import {
  getMediaDownloadFilename,
  getStatusCopyText,
  getStatusDetailPath,
  hasTextSelectionWithin,
  openStatusDetailInNewTab,
} from './feed-card/feed-card-utils'

export const FeedCard = memo(function FeedCard({
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
  const {
    feedInteractionMode,
    feedPrimaryActionOrder,
    feedToolbarButtonIds,
    ratingEnabled,
    autoLoadLongText,
    textOnlyFeed,
  } = useAppSettings(
    useShallow((s) => ({
      feedInteractionMode: s.feedInteractionMode,
      feedPrimaryActionOrder: s.feedPrimaryActionOrder,
      feedToolbarButtonIds: s.feedToolbarButtonIds,
      ratingEnabled: s.ratingEnabled,
      autoLoadLongText: s.autoLoadLongText,
      textOnlyFeed: s.textOnlyFeed,
    })),
  )
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const commentsPanelId = useId()
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const feedCardRef = useRef<HTMLDivElement>(null)
  const hasEnteredViewport = useHasEnteredViewport(feedCardRef)
  const isTimeline = surfaceProp === 'timeline'
  const shouldAutoLoadLongText = isTimeline && autoLoadLongText && hasEnteredViewport
  const isTextOnly = isTimeline && textOnlyFeed
  const {
    resolvedItem,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item, shouldAutoLoadLongText)

  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(resolvedItem)
  }, [resolvedItem])

  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === resolvedItem.author.id
  const queryClient = useQueryClient()
  const { openGenImage } = useGenImageDialog()
  const { downloadDialog, downloadLoading, handleDownload } = useFeedCardMediaDownload(resolvedItem)
  const moreMenuActionIds = FEED_TOOLBAR_BUTTON_IDS.filter(
    (id) => !feedToolbarButtonIds.includes(id),
  )

  const likeMutation = useMutation({
    mutationFn: async (target: FeedItem) => {
      if (target.liked) {
        await cancelStatusLike(target.id)
      } else {
        await setStatusLike(target.id)
      }
    },
    onMutate: (target: FeedItem) => optimisticallyToggleStatusLike(queryClient, target),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weibo', 'liked-statuses'] })
    },
    onError: (_error, _target, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(_error instanceof Error ? _error.message : '操作失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (target: FeedItem) => deleteWeiboStatus(target.id),
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: (_data, target) => {
      toast.success('已删除')
      if (target.id === item.id) {
        onStatusDeleted?.()
      }
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
    onMutate: (target: FeedItem) => optimisticallyToggleStatusFavorite(queryClient, target),
    onSuccess: (_data, target) => {
      toast.success(target.favorited ? '取消收藏成功' : '收藏成功')
    },
    onError: (_error, target, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(_error instanceof Error ? _error.message : '操作失败')
    },
  })

  const unfavoriteMutation = useMutation({
    mutationFn: (targetId: string) => destroyFavorite(targetId),
    onMutate: (targetId: string) => optimisticallyRemoveStatusFromFavorites(queryClient, targetId),
    onSuccess: () => {
      toast.success('取消收藏成功')
    },
    onError: (error, _targetId, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(error instanceof Error ? error.message : '取消收藏失败')
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

  const detailPath = getStatusDetailPath(resolvedItem)
  const canNavigate =
    feedInteractionMode === 'x' &&
    onNavigate !== undefined &&
    statusAllowsCardNavigate(surfaceProp, 'root') &&
    detailPath !== null
  const navigationProps = canNavigate
    ? ({
        role: 'link',
        tabIndex: 0,
        'aria-label': `查看 ${resolvedItem.author.name || '微博'} 的微博详情`,
      } as const)
    : {}

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    if (!canNavigate) {
      return
    }

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const target = event.target as HTMLElement
    const isOnInteractiveChild = target.closest(
      'a,button,[role="button"],input,textarea,select,label',
    )

    // cmd/ctrl + left click on the inert area → open in new tab. The browser
    // already handles modifier+click on inner <a>/<button> children natively.
    if (
      event.button === 0 &&
      (event.metaKey || event.ctrlKey) &&
      !isOnInteractiveChild &&
      !hasTextSelectionWithin(event.currentTarget) &&
      detailPath !== null
    ) {
      openStatusDetailInNewTab(detailPath)
      return
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    if (isOnInteractiveChild) {
      return
    }

    if (hasTextSelectionWithin(event.currentTarget)) {
      return
    }

    onNavigate?.(resolvedItem)
  }

  const handleCardAuxClick = (event: MouseEvent<HTMLElement>) => {
    if (!canNavigate || event.button !== 1 || detailPath === null) {
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

    openStatusDetailInNewTab(detailPath)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canNavigate) {
      return
    }

    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onNavigate?.(resolvedItem)
  }

  const handleCommentExpand = useCallback(() => {
    setCommentsExpanded((prev) => !prev)
  }, [])
  const canExpandInlineComments = feedInteractionMode === 'weibo'

  const handleCopyLink = useCallback((target: FeedItem) => {
    const weiboUrl = `https://weibo.com/${target.author.id}/${target.mblogId}`
    void navigator.clipboard
      .writeText(weiboUrl)
      .then(() => {
        toast.success('已复制链接')
      })
      .catch(() => {
        toast.error('复制失败，请稍后再试')
      })
  }, [])

  const handleCopyText = useCallback((target: FeedItem) => {
    const copyText = getStatusCopyText(target)
    if (!copyText) {
      toast.error('没有可复制的文字')
      return
    }

    void navigator.clipboard
      .writeText(copyText)
      .then(() => {
        toast.success('已复制文字')
      })
      .catch(() => {
        toast.error('复制失败，请稍后再试')
      })
  }, [])

  if (resolvedItem.deleted) {
    return (
      <Card className={cn('xb-feed-card xb-feed-card--compact gap-4 py-4 relative', className)}>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <p className="text-muted-foreground text-sm">此微博已被删除</p>
          {resolvedItem.favorited ? (
            <Button
              variant="outline"
              size="sm"
              disabled={unfavoriteMutation.isPending}
              aria-busy={unfavoriteMutation.isPending || undefined}
              onClick={(event) => {
                event.stopPropagation()
                void unfavoriteMutation.mutateAsync(resolvedItem.id)
              }}
            >
              <Bookmark className="mr-1 size-3" />
              取消收藏
            </Button>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div ref={feedCardRef}>
      <Card
        className={cn(
          'xb-feed-card group/card relative gap-4 py-4',
          canNavigate &&
            'cursor-pointer focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
          className,
        )}
        data-testid="feed-card-body"
        onClick={handleCardClick}
        onAuxClick={handleCardAuxClick}
        onKeyDown={handleCardKeyDown}
        {...navigationProps}
      >
        {resolvedItem.title ? (
          <div className="px-4">
            <Badge variant="secondary">{resolvedItem.title.text}</Badge>
          </div>
        ) : null}
        <div className="relative flex items-start gap-2 pr-2 pl-0">
          <div className="min-w-0 flex-1">
            <FeedAuthorHeader
              item={resolvedItem}
              hideAvatar={isTextOnly}
              trailing={
                ratingEnabled ? (
                  <RatingSummaryBadge targetUid={resolvedItem.author.id} size="sm" useBatchCache />
                ) : null
              }
            />
          </div>
          <div className="shrink-0 pt-1 pr-2">
            <FeedCardMoreMenu
              type="status"
              isOwner={showOwnerMenu}
              item={resolvedItem}
              favorited={resolvedItem.favorited}
              onFavorite={() => favoriteMutation.mutateAsync(resolvedItem)}
              contentLabel="这条微博"
              isDeleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutateAsync(resolvedItem)}
              visibleActionIds={moreMenuActionIds}
              onCopyText={() => handleCopyText(resolvedItem)}
            />
          </div>
        </div>
        <CardContent
          className="flex flex-col gap-4 px-4"
          onMouseDown={handleCardMouseDown}
          onMouseUp={handleCardMouseUp}
        >
          <FeedTextBlock
            item={resolvedItem}
            canLoadLongText={shouldShowLoadLongText}
            isLongTextLoading={isLongTextLoading}
            hasLongTextError={hasLongTextError}
            onLoadLongText={onLoadLongText}
            hideMedia={isTextOnly}
          />

          {!isTextOnly ? <FeedMediaBlock item={resolvedItem} /> : null}

          {!isTextOnly ? (
            <ImageCarousel
              images={resolvedItem.images}
              mixMediaItems={resolvedItem.mixMediaInfo}
              downloadFilename={getMediaDownloadFilename(resolvedItem)}
              onOpen={addEntry}
            />
          ) : null}

          {resolvedItem.retweetedStatus ? (
            <RetweetedFeedBlock
              item={resolvedItem.retweetedStatus}
              onNavigate={onNavigate}
              onCommentClick={onCommentClick}
              onRepostClick={onRepostClick}
              onLikeClick={(target) => likeMutation.mutate(target)}
              likePending={likePendingId === resolvedItem.retweetedStatus.id}
              onFavorite={(target) => favoriteMutation.mutateAsync(target)}
              favoritePending={
                favoriteMutation.isPending &&
                favoriteMutation.variables?.id === resolvedItem.retweetedStatus.id
              }
              onDelete={(target) => deleteMutation.mutateAsync(target)}
              feedInteractionMode={feedInteractionMode}
              primaryActionOrder={feedPrimaryActionOrder}
              toolbarButtonIds={feedToolbarButtonIds}
              moreMenuActionIds={moreMenuActionIds}
              autoLoadLongText={shouldAutoLoadLongText}
              textOnly={isTextOnly}
            />
          ) : null}
        </CardContent>
        <CardFooter className="px-4">
          <FeedActions
            item={resolvedItem}
            surface={surfaceProp}
            onCommentClick={onCommentClick}
            onCommentExpand={handleCommentExpand}
            commentsExpanded={commentsExpanded}
            commentsPanelId={canExpandInlineComments ? commentsPanelId : undefined}
            onRepostClick={onRepostClick}
            onLikeClick={(target) => likeMutation.mutate(target)}
            likePending={likePendingId === resolvedItem.id}
            feedInteractionMode={feedInteractionMode}
            primaryActionOrder={feedPrimaryActionOrder}
            toolbarButtonIds={feedToolbarButtonIds}
            favorited={resolvedItem.favorited}
            onFavorite={() => favoriteMutation.mutateAsync(resolvedItem)}
            favoritePending={favoriteMutation.isPending}
            onCopyLink={() => handleCopyLink(resolvedItem)}
            onCopyText={() => handleCopyText(resolvedItem)}
            onGenImage={() => openGenImage(resolvedItem)}
            onDownload={() => void handleDownload()}
            downloadPending={downloadLoading}
          />
        </CardFooter>
        {commentsExpanded && canExpandInlineComments ? (
          <FeedCommentsExpanded
            id={commentsPanelId}
            item={resolvedItem}
            onCollapse={handleCommentExpand}
          />
        ) : null}
        {downloadDialog}
      </Card>
    </div>
  )
})
