import { useCallback, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
} from '@/lib/app-settings'
import { cn } from '@/lib/utils'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import { useFeedLongText } from '@/lib/weibo/hooks/use-feed-long-text'
import type { FeedItem } from '@/lib/weibo/models/feed'

import { FeedActions } from './feed-card-actions'
import { RetweetedAuthorHeader } from './feed-card-author'
import { FeedMediaBlock } from './feed-card-media'
import { FeedTextBlock } from './feed-card-text'
import {
  getMediaDownloadFilename,
  getStatusCopyText,
  getStatusDetailPath,
  hasTextSelectionWithin,
  openStatusDetailInNewTab,
} from './feed-card-utils'

export function RetweetedFeedBlock({
  item,
  onNavigate,
  onCommentClick,
  onRepostClick,
  onLikeClick,
  likePendingForId,
  feedInteractionMode,
  primaryActionOrder,
  toolbarButtonIds,
  onFavorite,
  favoritePendingForId,
}: {
  item: NonNullable<FeedItem['retweetedStatus']>
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePendingForId: string | null
  feedInteractionMode: FeedInteractionMode
  primaryActionOrder: FeedPrimaryActionId[]
  toolbarButtonIds: FeedToolbarButtonId[]
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
  const { openGenImage } = useGenImageDialog()
  const { downloadDialog, downloadLoading, handleDownload } = useFeedCardMediaDownload(resolvedItem)

  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(resolvedItem)
  }, [resolvedItem])

  const isDeletedAuthor = !resolvedItem.author.id
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

  const handleCopyLink = () => {
    const weiboUrl = `https://weibo.com/${resolvedItem.author.id}/${resolvedItem.mblogId}`
    void navigator.clipboard.writeText(weiboUrl).then(() => {
      toast.success('已复制链接')
    })
  }

  const handleCopyText = () => {
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

    onNavigate?.(resolvedItem)
  }

  return (
    <Card
      className={cn(
        'xb-feed-card xb-feed-card--compact gap-3 py-4',
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
          downloadFilename={getMediaDownloadFilename(resolvedItem)}
          onOpen={addEntry}
        />

        {!isDeletedAuthor && (
          <FeedActions
            item={resolvedItem}
            onCommentClick={handleRetweetedCommentClick}
            onCommentExpand={onNavigate}
            onRepostClick={onRepostClick}
            onLikeClick={onLikeClick}
            likePending={likePendingForId === resolvedItem.id}
            feedInteractionMode={feedInteractionMode}
            primaryActionOrder={primaryActionOrder}
            toolbarButtonIds={toolbarButtonIds}
            favorited={resolvedItem.favorited}
            onFavorite={onFavorite ? () => onFavorite(resolvedItem) : undefined}
            favoritePending={favoritePendingForId === resolvedItem.id}
            onCopyLink={handleCopyLink}
            onCopyText={handleCopyText}
            onGenImage={() => openGenImage(resolvedItem)}
            onDownload={() => void handleDownload()}
            downloadPending={downloadLoading}
          />
        )}
      </CardContent>
      {downloadDialog}
    </Card>
  )
}
