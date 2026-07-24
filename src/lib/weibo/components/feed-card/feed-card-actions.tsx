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
import type { MouseEvent, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
} from '@/lib/app-settings'
import { cn } from '@/lib/utils'
import type { FeedItem } from '@/lib/weibo/models/feed'
import type { StatusFeedSurface } from '@/lib/weibo/models/status-presentation'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

const FEED_ACTION_TINT = {
  comment: 'hover:bg-sky-500/10 hover:text-sky-500',
  repost: 'hover:bg-emerald-500/10 hover:text-emerald-500',
  like: 'hover:bg-rose-500/10 hover:text-rose-500',
  // Secondary tools stay muted — Silent Canvas: only comment/repost/like earn color.
  tool: 'hover:bg-muted hover:text-foreground',
} as const

const FEED_ACTION_ICON_TINT = {
  comment: 'group-hover:text-sky-500',
  repost: 'group-hover:text-emerald-500',
  like: 'group-hover:text-rose-500',
  tool: 'group-hover:text-foreground',
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
  ariaBusy,
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
  ariaBusy?: boolean
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
      aria-busy={ariaBusy || undefined}
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

export function FeedActions({
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
        ariaBusy={likePending}
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
          tint={FEED_ACTION_TINT.tool}
          iconTint={FEED_ACTION_ICON_TINT.tool}
          ariaLabel="生图"
          icon={<Image className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.tool)} />}
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
          tint={FEED_ACTION_TINT.tool}
          iconTint={FEED_ACTION_ICON_TINT.tool}
          ariaLabel="批量下载"
          disabled={downloadPending}
          icon={
            <Download className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.tool)} />
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
          tint={FEED_ACTION_TINT.tool}
          iconTint={FEED_ACTION_ICON_TINT.tool}
          ariaLabel={isBookmarked ? '取消收藏' : '收藏'}
          ariaPressed={isBookmarked}
          disabled={favoritePending}
          ariaBusy={favoritePending}
          icon={
            <Bookmark
              className={cn(
                'size-3.5 transition-[color,fill] duration-200',
                FEED_ACTION_ICON_TINT.tool,
                isBookmarked && 'fill-foreground text-foreground',
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
          tint={FEED_ACTION_TINT.tool}
          iconTint={FEED_ACTION_ICON_TINT.tool}
          ariaLabel="复制链接"
          icon={
            <LinkIcon className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.tool)} />
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
          tint={FEED_ACTION_TINT.tool}
          iconTint={FEED_ACTION_ICON_TINT.tool}
          ariaLabel="复制内容"
          icon={<Copy className={cn('size-3.5 transition-colors', FEED_ACTION_ICON_TINT.tool)} />}
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
