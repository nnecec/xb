import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark,
  Copy,
  Download,
  Heart,
  Image,
  LinkIcon,
  MessageCircle,
  Repeat2,
} from 'lucide-react'
import {
  memo,
  useCallback,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react'
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
import {
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
  FEED_TOOLBAR_BUTTON_IDS,
} from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { FeedCommentsExpanded } from '@/lib/weibo/components/feed-comments-expanded'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { RatingSummaryBadge } from '@/lib/weibo/components/rating-panel'
import { StatusText } from '@/lib/weibo/components/status-text'
import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
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
  optimisticallyRemoveStatusFromFavorites,
  optimisticallyToggleStatusFavorite,
  optimisticallyToggleStatusLike,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'
import {
  cancelStatusLike,
  createFavorite,
  deleteWeiboStatus,
  destroyFavorite,
  setStatusLike,
} from '@/lib/weibo/services/weibo-repository'
import { sanitizeFilename } from '@/lib/weibo/utils/filename'
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

function openStatusDetailInNewTab(path: string): void {
  // Use the full URL so the new tab loads at the correct weibo.com path
  // regardless of the current location. The xb content script runs on
  // https://weibo.com/* and react-router picks up the new path on load.
  window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer')
}

function getMediaDownloadFilename(item: Pick<FeedItem, 'author' | 'text'>) {
  return `${item.author.name} ${sanitizeFilename(item.text.slice(0, 15))}`
}

function getStatusCopyText(item: Pick<FeedItem, 'text' | 'markdownText'>) {
  return item.markdownText || item.text
}

function getStatusDetailPath(item: Pick<FeedItem, 'author' | 'id' | 'mblogId'>) {
  const statusId = item.mblogId ?? item.id
  if (!item.author.id || !statusId) return null
  return `/${item.author.id}/${statusId}`
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
        <AspectRatio
          ratio={16 / 9}
          className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        >
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
      className="max-w-[650px]"
    >
      <AspectRatio
        ratio={item.media.videoOrientation === 'vertical' ? 4 / 3 : 16 / 9}
        className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
      >
        <VideoPlayer
          progressiveSrc={item.media.streamUrl}
          poster={item.media.coverUrl ?? undefined}
          dash={item.media.dash}
          downloadUrl={item.media.downloadUrl}
          downloadFilename={getMediaDownloadFilename(item)}
          onPlay={addEntry}
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
              {trailing ? (
                <div
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {trailing}
                </div>
              ) : null}
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
  const { textClassName } = useFontSettings()
  const [textMode, setTextMode] = useState<'markdown' | 'plain'>('markdown')
  const canRenderMarkdown = Boolean(item.isMarkdown && item.markdownText)
  const resolvedTextMode = canRenderMarkdown ? textMode : 'plain'

  return (
    <div className={cn('text-foreground', textClassName)}>
      <StatusText item={item} text={item.text} mode={resolvedTextMode} />

      {canLoadLongText ? (
        <LongTextButton
          onClick={(event) => {
            event.stopPropagation()
            onLoadLongText()
          }}
          isLoading={isLongTextLoading}
          hasError={hasLongTextError}
        />
      ) : null}

      {canRenderMarkdown ? (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="text-muted-foreground h-auto px-0 py-1 text-xs"
          onClick={(event) => {
            event.stopPropagation()
            setTextMode((mode) => (mode === 'markdown' ? 'plain' : 'markdown'))
          }}
        >
          {textMode === 'markdown' ? '查看原文' : '查看渲染'}
        </Button>
      ) : null}
    </div>
  )
}

function LongTextButton({
  onClick,
  isLoading,
  hasError,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  isLoading: boolean
  hasError: boolean
}) {
  const label = isLoading ? '加载全文' : hasError ? '重试全文' : '阅读全文'

  return (
    <Button
      type="button"
      variant={hasError ? 'destructive' : 'secondary'}
      className={cn(isLoading && 'cursor-wait')}
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {label}
    </Button>
  )
}

const FEED_ACTION_TINT = {
  comment: 'hover:bg-sky-500/10 hover:text-sky-500',
  repost: 'hover:bg-emerald-500/10 hover:text-emerald-500',
  like: 'hover:bg-rose-500/10 hover:text-rose-500',
  genImage: 'hover:bg-violet-500/10 hover:text-violet-500',
  download: 'hover:bg-indigo-500/10 hover:text-indigo-500',
  favorite: 'hover:bg-amber-500/10 hover:text-amber-500',
  copyLink: 'hover:bg-cyan-500/10 hover:text-cyan-500',
  copyText: 'hover:bg-muted hover:text-foreground',
} as const

const FEED_ACTION_ICON_TINT = {
  comment: 'group-hover:text-sky-500',
  repost: 'group-hover:text-emerald-500',
  like: 'group-hover:text-rose-500',
  genImage: 'group-hover:text-violet-500',
  download: 'group-hover:text-indigo-500',
  favorite: 'group-hover:text-amber-500',
  copyLink: 'group-hover:text-cyan-500',
  copyText: 'group-hover:text-foreground',
} as const

function FeedActionButton({
  tint,
  iconTint,
  icon,
  count,
  countClassName,
  ariaLabel,
  ariaPressed,
  ariaControls,
  ariaExpanded,
  disabled,
  onClick,
}: {
  tint: string
  iconTint: string
  icon: ReactNode
  count?: number
  countClassName?: string
  ariaLabel: string
  ariaPressed?: boolean
  ariaControls?: string
  ariaExpanded?: boolean
  disabled?: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      className={cn('group rounded-full py-2 font-normal', tint)}
      onClick={onClick}
    >
      {icon}
      {count !== undefined ? (
        <span className={cn('tabular-nums transition-colors', iconTint, countClassName)}>
          {formatWeiboCount(count)}
        </span>
      ) : null}
    </Button>
  )
}

function FeedActions({
  item,
  surface,
  onCommentClick,
  onCommentExpand,
  commentsExpanded,
  commentsPanelId,
  onRepostClick,
  onLikeClick,
  likePending,
  feedInteractionMode,
  primaryActionOrder,
  toolbarButtonIds,
  favorited,
  onFavorite,
  favoritePending,
  onCopyLink,
  onCopyText,
  onGenImage,
  onDownload,
  downloadPending,
}: {
  item: FeedItem
  surface?: StatusFeedSurface
  onCommentClick?: (item: FeedItem) => void
  onCommentExpand?: (item: FeedItem) => void
  commentsExpanded?: boolean
  commentsPanelId?: string
  onRepostClick?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
  likePending?: boolean
  feedInteractionMode: FeedInteractionMode
  primaryActionOrder: FeedPrimaryActionId[]
  toolbarButtonIds: FeedToolbarButtonId[]
  favorited?: boolean
  onFavorite?: () => void | Promise<void>
  favoritePending?: boolean
  onCopyLink?: () => void
  onCopyText?: () => void
  onGenImage?: () => void
  onDownload?: () => void
  downloadPending?: boolean
}) {
  const liked = item.liked === true
  const isBookmarked = favorited === true
  const isDetail = surface === 'detail'
  const controlsInlineComments =
    commentsPanelId !== undefined &&
    onCommentExpand !== undefined &&
    !isDetail &&
    feedInteractionMode === 'weibo'
  const canDownload =
    item.images.length > 0 || item.media !== null || (item.mixMediaInfo?.length ?? 0) > 0

  function renderPrimaryAction(id: FeedPrimaryActionId) {
    if (id === 'comment') {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.comment}
          iconTint={FEED_ACTION_ICON_TINT.comment}
          ariaControls={controlsInlineComments ? commentsPanelId : undefined}
          ariaExpanded={controlsInlineComments ? commentsExpanded === true : undefined}
          ariaLabel={
            controlsInlineComments
              ? commentsExpanded
                ? '收起精选评论'
                : '展开精选评论'
              : '回复微博'
          }
          icon={
            <MessageCircle
              className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.comment)}
            />
          }
          count={item.stats.comments}
          onClick={(event) => {
            event.stopPropagation()
            if (!controlsInlineComments) {
              onCommentClick?.(item)
            } else {
              onCommentExpand?.(item)
            }
          }}
        />
      )
    }

    if (id === 'repost') {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.repost}
          iconTint={FEED_ACTION_ICON_TINT.repost}
          ariaLabel="转发微博"
          icon={
            <Repeat2 className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.repost)} />
          }
          count={item.stats.reposts}
          onClick={(event) => {
            event.stopPropagation()
            onRepostClick?.(item)
          }}
        />
      )
    }

    return (
      <FeedActionButton
        key={id}
        tint={FEED_ACTION_TINT.like}
        iconTint={FEED_ACTION_ICON_TINT.like}
        ariaLabel={liked ? '取消点赞' : '点赞微博'}
        ariaPressed={liked}
        disabled={likePending}
        icon={
          <Heart
            className={cn(
              'size-3.5 transition-[color,fill] duration-200',
              FEED_ACTION_ICON_TINT.like,
              liked && 'fill-rose-500 text-rose-500',
            )}
          />
        }
        count={item.stats.likes}
        countClassName={liked ? 'text-rose-500' : undefined}
        onClick={(event) => {
          event.stopPropagation()
          onLikeClick?.(item)
        }}
      />
    )
  }

  function renderToolbarButton(id: FeedToolbarButtonId) {
    if (id === 'gen-image' && onGenImage) {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.genImage}
          iconTint={FEED_ACTION_ICON_TINT.genImage}
          ariaLabel="生图"
          icon={
            <Image className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.genImage)} />
          }
          onClick={(event) => {
            event.stopPropagation()
            onGenImage()
          }}
        />
      )
    }

    if (id === 'download-media' && canDownload && onDownload) {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.download}
          iconTint={FEED_ACTION_ICON_TINT.download}
          ariaLabel="批量下载"
          disabled={downloadPending}
          icon={
            <Download
              className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.download)}
            />
          }
          onClick={(event) => {
            event.stopPropagation()
            onDownload()
          }}
        />
      )
    }

    if (id === 'favorite' && onFavorite) {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.favorite}
          iconTint={FEED_ACTION_ICON_TINT.favorite}
          ariaLabel={isBookmarked ? '取消收藏' : '收藏'}
          ariaPressed={isBookmarked}
          disabled={favoritePending}
          icon={
            <Bookmark
              className={cn(
                'size-3.5 transition-[color,fill] duration-200',
                FEED_ACTION_ICON_TINT.favorite,
                isBookmarked && 'fill-amber-500 text-amber-500',
              )}
            />
          }
          onClick={(event) => {
            event.stopPropagation()
            void onFavorite()
          }}
        />
      )
    }

    if (id === 'copy-link' && item.mblogId && onCopyLink) {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.copyLink}
          iconTint={FEED_ACTION_ICON_TINT.copyLink}
          ariaLabel="复制链接"
          icon={
            <LinkIcon
              className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.copyLink)}
            />
          }
          onClick={(event) => {
            event.stopPropagation()
            onCopyLink()
          }}
        />
      )
    }

    if (id === 'copy-text' && onCopyText) {
      return (
        <FeedActionButton
          key={id}
          tint={FEED_ACTION_TINT.copyText}
          iconTint={FEED_ACTION_ICON_TINT.copyText}
          ariaLabel="复制内容"
          icon={
            <Copy className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.copyText)} />
          }
          onClick={(event) => {
            event.stopPropagation()
            onCopyText()
          }}
        />
      )
    }

    return null
  }

  const toolbarButtons = toolbarButtonIds.map(renderToolbarButton).filter(Boolean)

  return (
    <div className="text-muted-foreground flex w-full items-center gap-2 text-xs">
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
        {primaryActionOrder.map(renderPrimaryAction)}
      </div>
      {toolbarButtons.length > 0 ? (
        <div className="flex shrink-0 items-center justify-end gap-0.5 px-3">{toolbarButtons}</div>
      ) : null}
    </div>
  )
}

function RetweetedFeedBlock({
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

export const FeedCard = memo(function FeedCard({
  item,
  surface: surfaceProp = 'timeline',
  onNavigate,
  onCommentClick,
  onRepostClick,
  onCommentReply,
  onStatusDeleted,
  className,
}: {
  item: FeedItem
  surface?: StatusFeedSurface
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onCommentReply?: (target: import('@/lib/weibo/models/compose').ComposeTarget) => void
  /** After deleting this status (owner only), e.g. navigate back from detail. */
  onStatusDeleted?: () => void
  className?: string
}) {
  const { feedInteractionMode, feedPrimaryActionOrder, feedToolbarButtonIds, ratingEnabled } =
    useAppSettings(
      useShallow((s) => ({
        feedInteractionMode: s.feedInteractionMode,
        feedPrimaryActionOrder: s.feedPrimaryActionOrder,
        feedToolbarButtonIds: s.feedToolbarButtonIds,
        ratingEnabled: s.ratingEnabled,
      })),
    )
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const commentsPanelId = useId()
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
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
    onSuccess: (_data, target) => {
      if (target.liked) {
        void queryClient.invalidateQueries({ queryKey: ['weibo', 'liked-statuses'] })
      }
    },
    onError: (_error, _target, context) => {
      restoreStatusCacheMutation(queryClient, context)
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

    onNavigate?.(resolvedItem)
  }

  const handleCommentExpand = useCallback(() => {
    setCommentsExpanded((prev) => !prev)
  }, [])
  const canExpandInlineComments = feedInteractionMode === 'weibo' && onCommentReply !== undefined

  const handleCopyLink = useCallback((target: FeedItem) => {
    const weiboUrl = `https://weibo.com/${target.author.id}/${target.mblogId}`
    void navigator.clipboard.writeText(weiboUrl).then(() => {
      toast.success('已复制链接')
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
          <Button
            variant="outline"
            size="sm"
            disabled={unfavoriteMutation.isPending}
            onClick={(event) => {
              event.stopPropagation()
              void unfavoriteMutation.mutateAsync(resolvedItem.id)
            }}
          >
            <Bookmark className="mr-1 size-3" />
            取消收藏
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'xb-feed-card group/card gap-4 py-4 relative',
        canNavigate && 'cursor-pointer outline-none',
        className,
      )}
      data-testid="feed-card-body"
      onClick={handleCardClick}
      onAuxClick={handleCardAuxClick}
      onKeyDown={handleCardKeyDown}
      {...navigationProps}
    >
      <div className="absolute top-4 right-4">
        <FeedCardMoreMenu
          type="status"
          isOwner={showOwnerMenu}
          item={resolvedItem}
          favorited={resolvedItem.favorited}
          onFavorite={() => favoriteMutation.mutateAsync(resolvedItem)}
          contentLabel="这条微博"
          isDeleting={deleteMutation.isPending}
          onDelete={() => deleteMutation.mutateAsync()}
          visibleActionIds={moreMenuActionIds}
          onCopyText={() => handleCopyText(resolvedItem)}
        />
      </div>
      {resolvedItem.title ? (
        <div className="px-4">
          <Badge variant="secondary">{resolvedItem.title.text}</Badge>
        </div>
      ) : null}
      <FeedAuthorHeader
        item={resolvedItem}
        trailing={
          ratingEnabled ? (
            <RatingSummaryBadge targetUid={resolvedItem.author.id} size="sm" useBatchCache />
          ) : null
        }
      />
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

        <ImageCarousel
          images={resolvedItem.images}
          mixMediaItems={resolvedItem.mixMediaInfo}
          downloadFilename={getMediaDownloadFilename(resolvedItem)}
          onOpen={addEntry}
        />

        {resolvedItem.retweetedStatus ? (
          <RetweetedFeedBlock
            item={resolvedItem.retweetedStatus}
            onNavigate={onNavigate}
            onCommentClick={onCommentClick}
            onRepostClick={onRepostClick}
            onLikeClick={(target) => likeMutation.mutate(target)}
            likePendingForId={likePendingId}
            feedInteractionMode={feedInteractionMode}
            primaryActionOrder={feedPrimaryActionOrder}
            toolbarButtonIds={feedToolbarButtonIds}
            onFavorite={(target) => favoriteMutation.mutate(target)}
            favoritePendingForId={
              favoriteMutation.isPending ? resolvedItem.retweetedStatus.id : null
            }
          />
        ) : null}
      </CardContent>
      <CardFooter>
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
          onCommentReply={onCommentReply}
          onCollapse={handleCommentExpand}
        />
      ) : null}
      {downloadDialog}
    </Card>
  )
})
