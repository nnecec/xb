import { useCallback, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  type ContentDensity,
  type ContentDisplay,
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
} from '@/lib/app-settings'
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import { useFeedLongText } from '@/lib/weibo/hooks/use-feed-long-text'
import { useHasEnteredViewport } from '@/lib/weibo/hooks/use-has-entered-viewport'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'

import { MediaRegion } from '../media-region/media-region'
import { FeedActions } from './feed-card-actions'
import { RetweetedAuthorHeader } from './feed-card-author'
import { FeedTextBlock } from './feed-card-text'
import {
  getMediaDownloadFilename,
  getStatusCopyText,
  getStatusDetailPath,
  hasTextSelectionWithin,
  openStatusDetailInNewTab,
} from './feed-card-utils'

/**
 * Nested retweet preview with the same actions as the root status.
 */
export function RetweetedFeedBlock({
  item,
  onNavigate,
  onCommentClick,
  onRepostClick,
  onLikeClick,
  likePending,
  onFavorite,
  favoritePending,
  onDelete,
  feedInteractionMode,
  primaryActionOrder,
  toolbarButtonIds,
  moreMenuActionIds,
  autoLoadLongText,
  density,
  showAvatar,
  showTimestamp,
  showPublishInfo,
  showInteractionCounts,
  imageDisplay,
}: {
  item: NonNullable<FeedItem['retweetedStatus']>
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onLikeClick: (item: FeedItem) => void
  likePending: boolean
  onFavorite: (item: FeedItem) => void | Promise<void>
  favoritePending: boolean
  onDelete: (item: FeedItem) => void | Promise<void>
  feedInteractionMode: FeedInteractionMode
  primaryActionOrder: FeedPrimaryActionId[]
  toolbarButtonIds: FeedToolbarButtonId[]
  moreMenuActionIds: FeedToolbarButtonId[]
  autoLoadLongText: boolean
  density: ContentDensity
  showAvatar: boolean
  showTimestamp: boolean
  showPublishInfo: boolean
  showInteractionCounts: boolean
  imageDisplay: ContentDisplay
}) {
  const retweetedCardRef = useRef<HTMLDivElement>(null)
  const hasEnteredViewport = useHasEnteredViewport(retweetedCardRef)
  const {
    resolvedItem,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item, autoLoadLongText && hasEnteredViewport)
  const { openGenImage } = useGenImageDialog()
  const { downloadDialog, downloadLoading, handleDownload } = useFeedCardMediaDownload(resolvedItem)

  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(resolvedItem)
  }, [resolvedItem])

  const isDeletedAuthor = !resolvedItem.author.id
  const currentUserUid = getCurrentUserUid()
  const isOwner = currentUserUid !== null && currentUserUid === resolvedItem.author.id
  const detailPath = getStatusDetailPath(resolvedItem)
  const canNavigate = feedInteractionMode === 'x' && onNavigate !== undefined && detailPath !== null
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const navigationProps = canNavigate
    ? ({
        role: 'link',
        tabIndex: 0,
        'aria-label': `查看 ${resolvedItem.author.name || '微博'} 的微博详情`,
      } as const)
    : {}

  const handleRetweetedMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      pointerDownPositionRef.current = null
      return
    }

    suppressNextClickRef.current = false
    pointerDownPositionRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleRetweetedMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !pointerDownPositionRef.current) {
      return
    }

    const deltaX = event.clientX - pointerDownPositionRef.current.x
    const deltaY = event.clientY - pointerDownPositionRef.current.y
    suppressNextClickRef.current = Math.hypot(deltaX, deltaY) > 4
    pointerDownPositionRef.current = null
  }

  const handleRetweetedClick = (event: MouseEvent<HTMLDivElement>) => {
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

  const handleRetweetedAuxClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
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

  const handleRetweetedKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canNavigate) return
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onNavigate?.(resolvedItem)
  }

  const handleRetweetedCommentClick = useCallback(
    (target: FeedItem) => {
      if (feedInteractionMode === 'weibo') {
        onNavigate?.(target)
      } else {
        onCommentClick?.(target)
      }
    },
    [feedInteractionMode, onNavigate, onCommentClick],
  )

  const handleCopyText = useCallback(() => {
    const copyText = getStatusCopyText(resolvedItem)
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
  }, [resolvedItem])

  return (
    <div ref={retweetedCardRef}>
      <Card
        className={cn(
          'xb-feed-card xb-feed-card--compact',
          density === 'compact' && 'gap-2.5 py-3',
          density === 'standard' && 'gap-3 py-4',
          density === 'relaxed' && 'gap-4 py-5',
          canNavigate &&
            'cursor-pointer focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
        )}
        data-testid="feed-card-body"
        onMouseDown={handleRetweetedMouseDown}
        onMouseUp={handleRetweetedMouseUp}
        onClick={handleRetweetedClick}
        onAuxClick={handleRetweetedAuxClick}
        onKeyDown={handleRetweetedKeyDown}
        {...navigationProps}
      >
        <CardHeader className="px-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <RetweetedAuthorHeader
                item={resolvedItem}
                hideAvatar={!showAvatar}
                showTimestamp={showTimestamp}
                showPublishInfo={showPublishInfo}
              />
            </div>
            {!isDeletedAuthor ? (
              <FeedCardMoreMenu
                type="status"
                isOwner={isOwner}
                item={resolvedItem}
                favorited={resolvedItem.favorited}
                onFavorite={() => onFavorite(resolvedItem)}
                onDelete={() => onDelete(resolvedItem)}
                contentLabel="这条微博"
                visibleActionIds={moreMenuActionIds}
                onCopyText={handleCopyText}
                className="-mt-1"
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            'flex flex-col px-4',
            density === 'compact' && 'gap-3',
            density === 'standard' && 'gap-4',
            density === 'relaxed' && 'gap-5',
          )}
        >
          <FeedTextBlock
            item={resolvedItem}
            canLoadLongText={shouldShowLoadLongText}
            isLongTextLoading={isLongTextLoading}
            hasLongTextError={hasLongTextError}
            onLoadLongText={onLoadLongText}
            imageDisplay={imageDisplay}
          />

          <MediaRegion
            item={resolvedItem}
            downloadFilename={getMediaDownloadFilename(resolvedItem)}
            onOpen={addEntry}
          />
        </CardContent>
        {!isDeletedAuthor ? (
          <CardFooter className="px-4">
            <FeedActions
              item={resolvedItem}
              onCommentClick={handleRetweetedCommentClick}
              onRepostClick={onRepostClick}
              onLikeClick={onLikeClick}
              likePending={likePending}
              feedInteractionMode={feedInteractionMode}
              primaryActionOrder={primaryActionOrder}
              toolbarButtonIds={toolbarButtonIds}
              favorited={resolvedItem.favorited}
              onFavorite={() => onFavorite(resolvedItem)}
              favoritePending={favoritePending}
              onCopyLink={() => {
                const weiboUrl = `https://weibo.com/${resolvedItem.author.id}/${resolvedItem.mblogId}`
                void navigator.clipboard
                  .writeText(weiboUrl)
                  .then(() => {
                    toast.success('已复制链接')
                  })
                  .catch(() => {
                    toast.error('复制失败，请稍后再试')
                  })
              }}
              onCopyText={handleCopyText}
              onGenImage={() => openGenImage(resolvedItem)}
              onDownload={() => void handleDownload()}
              downloadPending={downloadLoading}
              showInteractionCounts={showInteractionCounts}
            />
          </CardFooter>
        ) : null}
      </Card>
      {downloadDialog}
    </div>
  )
}
