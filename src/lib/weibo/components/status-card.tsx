import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  memo,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  FEED_TOOLBAR_BUTTON_IDS,
  type ContentDensity,
  type ContentDisplay,
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
} from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { FeedCardMoreMenu } from '@/lib/weibo/components/feed-card-more-menu'
import { FeedCommentsExpanded } from '@/lib/weibo/components/feed-comments-expanded'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
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
import type { StatusCardRole, StatusFeedSurface } from '@/lib/weibo/models/status-presentation'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import {
  optimisticallyRemoveStatusFromFavorites,
  optimisticallyToggleStatusFavorite,
  optimisticallyToggleStatusLike,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'

import { FeedActions } from './feed-card/feed-card-actions'
import { StatusCardAuthor } from './feed-card/feed-card-author'
import { FeedTextBlock } from './feed-card/feed-card-text'
import {
  getMediaDownloadFilename,
  getStatusCopyText,
  getStatusDetailPath,
  hasTextSelectionWithin,
  openStatusDetailInNewTab,
} from './feed-card/feed-card-utils'
import { MediaRegion } from './media-region/media-region'

type ComposeStatusMode = 'comment' | 'repost'

export interface StatusCardHost {
  openStatus: (status: FeedItem) => void
  composeStatus: (status: FeedItem, mode: ComposeStatusMode) => void
}

const StatusCardHostContext = createContext<StatusCardHost | null>(null)

export function StatusCardHostProvider({
  host,
  children,
}: {
  host: StatusCardHost
  children: ReactNode
}) {
  return <StatusCardHostContext value={host}>{children}</StatusCardHostContext>
}

function useStatusCardHost() {
  const host = useContext(StatusCardHostContext)
  if (!host) {
    throw new Error('StatusCard 必须渲染在 StatusCardHostProvider 内')
  }
  return host
}

interface StatusCardController {
  surface: StatusFeedSurface
  onRootDeleted?: () => void
  host: StatusCardHost
  feedInteractionMode: FeedInteractionMode
  feedPrimaryActionOrder: FeedPrimaryActionId[]
  feedToolbarButtonIds: FeedToolbarButtonId[]
  moreMenuActionIds: FeedToolbarButtonId[]
  ratingEnabled: boolean
  autoLoadLongText: boolean
  feedDensity: ContentDensity
  showAvatar: boolean
  showTimestamp: boolean
  showPublishInfo: boolean
  showTitleBadge: boolean
  showInteractionCounts: boolean
  imageDisplay: ContentDisplay
  like: (status: FeedItem) => void
  likePendingId: string | null
  favorite: (status: FeedItem) => Promise<void>
  favoritePendingId: string | null
  deleteStatus: (status: FeedItem) => Promise<void>
  deletePendingId: string | null
  unfavorite: (statusId: string) => Promise<void>
  unfavoritePending: boolean
}

const StatusCardControllerContext = createContext<StatusCardController | null>(null)

function useStatusCardController() {
  const controller = useContext(StatusCardControllerContext)
  if (!controller) {
    throw new Error('StatusCardView 缺少内部 controller')
  }
  return controller
}

export const StatusCard = memo(function StatusCard({ status }: { status: FeedItem }) {
  return <StatusCardRoot status={status} surface="timeline" />
})

export const DetailStatusCard = memo(function DetailStatusCard({ status }: { status: FeedItem }) {
  const navigate = useNavigate()
  const handleRootDeleted = useCallback(() => navigate(-1), [navigate])
  return <StatusCardRoot status={status} surface="detail" onRootDeleted={handleRootDeleted} />
})

function StatusCardRoot({
  status,
  surface,
  onRootDeleted,
}: {
  status: FeedItem
  surface: StatusFeedSurface
  onRootDeleted?: () => void
}) {
  const host = useStatusCardHost()
  const {
    feedInteractionMode,
    feedPrimaryActionOrder,
    feedToolbarButtonIds,
    ratingEnabled,
    autoLoadLongText,
    feedDensity,
    weiboCardShowAvatar,
    weiboCardShowTimestamp,
    weiboCardShowPublishInfo,
    weiboCardShowTitleBadge,
    weiboCardShowInteractionCounts,
    weiboCardMediaDisplay,
  } = useAppSettings(
    useShallow((s) => ({
      feedInteractionMode: s.feedInteractionMode,
      feedPrimaryActionOrder: s.feedPrimaryActionOrder,
      feedToolbarButtonIds: s.feedToolbarButtonIds,
      ratingEnabled: s.ratingEnabled,
      autoLoadLongText: s.autoLoadLongText,
      feedDensity: s.feedDensity,
      weiboCardShowAvatar: s.weiboCardShowAvatar,
      weiboCardShowTimestamp: s.weiboCardShowTimestamp,
      weiboCardShowPublishInfo: s.weiboCardShowPublishInfo,
      weiboCardShowTitleBadge: s.weiboCardShowTitleBadge,
      weiboCardShowInteractionCounts: s.weiboCardShowInteractionCounts,
      weiboCardMediaDisplay: s.weiboCardMediaDisplay,
    })),
  )
  const queryClient = useQueryClient()
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
      if (target.id === status.id) {
        onRootDeleted?.()
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

  const controller = useMemo<StatusCardController>(
    () => ({
      surface,
      onRootDeleted,
      host,
      feedInteractionMode,
      feedPrimaryActionOrder,
      feedToolbarButtonIds,
      moreMenuActionIds,
      ratingEnabled,
      autoLoadLongText,
      feedDensity,
      showAvatar: weiboCardShowAvatar,
      showTimestamp: weiboCardShowTimestamp,
      showPublishInfo: weiboCardShowPublishInfo,
      showTitleBadge: weiboCardShowTitleBadge,
      showInteractionCounts: weiboCardShowInteractionCounts,
      imageDisplay: weiboCardMediaDisplay,
      like: (target) => likeMutation.mutate(target),
      likePendingId,
      favorite: async (target) => {
        await favoriteMutation.mutateAsync(target)
      },
      favoritePendingId:
        favoriteMutation.isPending && favoriteMutation.variables
          ? favoriteMutation.variables.id
          : null,
      deleteStatus: async (target) => {
        await deleteMutation.mutateAsync(target)
      },
      deletePendingId:
        deleteMutation.isPending && deleteMutation.variables ? deleteMutation.variables.id : null,
      unfavorite: async (targetId) => {
        await unfavoriteMutation.mutateAsync(targetId)
      },
      unfavoritePending: unfavoriteMutation.isPending,
    }),
    [
      surface,
      onRootDeleted,
      host,
      feedInteractionMode,
      feedPrimaryActionOrder,
      feedToolbarButtonIds,
      moreMenuActionIds,
      ratingEnabled,
      autoLoadLongText,
      feedDensity,
      weiboCardShowAvatar,
      weiboCardShowTimestamp,
      weiboCardShowPublishInfo,
      weiboCardShowTitleBadge,
      weiboCardShowInteractionCounts,
      weiboCardMediaDisplay,
      likeMutation,
      likePendingId,
      favoriteMutation,
      deleteMutation,
      unfavoriteMutation,
    ],
  )

  return (
    <StatusCardControllerContext value={controller}>
      <StatusCardView status={status} role="root" />
    </StatusCardControllerContext>
  )
}

const ROLE_POLICY = {
  root: {
    canNavigate: (surface: StatusFeedSurface) => surface === 'timeline',
    density: (density: StatusCardController['feedDensity']) => density,
  },
  quoted: {
    canNavigate: () => true,
    density: (density: StatusCardController['feedDensity']) =>
      density === 'relaxed' ? 'standard' : 'compact',
  },
} satisfies Record<
  StatusCardRole,
  {
    canNavigate: (surface: StatusFeedSurface) => boolean
    density: (density: StatusCardController['feedDensity']) => StatusCardController['feedDensity']
  }
>

function StatusCardView({ status, role }: { status: FeedItem; role: StatusCardRole }) {
  const controller = useStatusCardController()
  const {
    surface,
    host,
    feedInteractionMode,
    feedPrimaryActionOrder,
    feedToolbarButtonIds,
    moreMenuActionIds,
    ratingEnabled,
    autoLoadLongText,
    feedDensity,
    showAvatar,
    showTimestamp,
    showPublishInfo,
    showTitleBadge,
    showInteractionCounts,
    imageDisplay,
  } = controller
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const commentsPanelId = useId()
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasEnteredViewport = useHasEnteredViewport(cardRef)
  const isTimeline = surface === 'timeline'
  const shouldAutoLoadLongText = isTimeline && autoLoadLongText && hasEnteredViewport
  const effectiveDensity = isTimeline ? ROLE_POLICY[role].density(feedDensity) : 'standard'
  const {
    resolvedItem,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(status, shouldAutoLoadLongText)
  const { openGenImage } = useGenImageDialog()
  const { downloadDialog, downloadLoading, handleDownload } = useFeedCardMediaDownload(resolvedItem)
  const addEntry = useCallback(() => {
    browsingHistoryStore.getState().addEntry(resolvedItem)
  }, [resolvedItem])
  const uid = getCurrentUserUid()
  const showOwnerMenu = uid !== null && uid === resolvedItem.author.id

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
    feedInteractionMode === 'x' && ROLE_POLICY[role].canNavigate(surface) && detailPath !== null
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

    host.openStatus(resolvedItem)
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
    host.openStatus(resolvedItem)
  }

  const handleCommentExpand = useCallback(() => {
    setCommentsExpanded((prev) => !prev)
  }, [])
  const canExpandInlineComments =
    role === 'root' && surface === 'timeline' && feedInteractionMode === 'weibo'

  const handleCommentClick = useCallback(
    (target: FeedItem) => {
      if (role === 'quoted' && feedInteractionMode === 'weibo') {
        host.openStatus(target)
        return
      }
      host.composeStatus(target, 'comment')
    },
    [feedInteractionMode, host, role],
  )

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
      <Card
        className={cn(
          'xb-feed-card xb-feed-card--compact relative gap-4 py-4',
          role === 'quoted' &&
            '-mx-4 rounded-none border-0 bg-muted/55 shadow-none sm:mx-0 sm:rounded-xl',
        )}
        data-status-card-role={role}
      >
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <p className="text-muted-foreground text-sm">此微博已被删除</p>
          {resolvedItem.favorited ? (
            <Button
              variant="outline"
              size="sm"
              disabled={controller.unfavoritePending}
              aria-busy={controller.unfavoritePending || undefined}
              onClick={(event) => {
                event.stopPropagation()
                void controller.unfavorite(resolvedItem.id)
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

  const isDeletedAuthor = !resolvedItem.author.id

  return (
    <div ref={cardRef}>
      <Card
        className={cn(
          'xb-feed-card group/card relative',
          surface === 'detail' && role === 'root' && 'border-border/55 bg-card/95',
          role === 'quoted' &&
            '-mx-4 rounded-none border-0 bg-muted/55 shadow-none sm:mx-0 sm:rounded-xl',
          effectiveDensity === 'compact' && 'gap-3 py-3',
          effectiveDensity === 'standard' && 'gap-4 py-4',
          effectiveDensity === 'relaxed' && 'gap-5 py-5',
          canNavigate &&
            'cursor-pointer focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
        )}
        data-testid="status-card-body"
        data-status-card-role={role}
        onMouseDown={handleCardMouseDown}
        onMouseUp={handleCardMouseUp}
        onClick={handleCardClick}
        onAuxClick={handleCardAuxClick}
        onKeyDown={handleCardKeyDown}
        {...navigationProps}
      >
        {showTitleBadge && resolvedItem.title ? (
          <div className="px-4">
            <Badge variant="secondary">{resolvedItem.title.text}</Badge>
          </div>
        ) : null}
        <div className="relative flex items-start gap-2 pr-2 pl-0">
          <div className="min-w-0 flex-1">
            <StatusCardAuthor
              item={resolvedItem}
              role={role}
              hideAvatar={!showAvatar}
              showTimestamp={showTimestamp}
              showPublishInfo={showPublishInfo}
              trailing={
                role === 'root' && ratingEnabled ? (
                  <RatingSummaryBadge targetUid={resolvedItem.author.id} size="sm" useBatchCache />
                ) : null
              }
            />
          </div>
          {!isDeletedAuthor ? (
            <div className="shrink-0 pt-1 pr-2">
              <FeedCardMoreMenu
                type="status"
                isOwner={showOwnerMenu}
                item={resolvedItem}
                favorited={resolvedItem.favorited}
                onFavorite={() => controller.favorite(resolvedItem)}
                contentLabel="这条微博"
                isDeleting={controller.deletePendingId === resolvedItem.id}
                onDelete={() => controller.deleteStatus(resolvedItem)}
                visibleActionIds={moreMenuActionIds}
                onCopyText={() => handleCopyText(resolvedItem)}
                className={role === 'quoted' ? '-mt-1' : undefined}
              />
            </div>
          ) : null}
        </div>
        <CardContent
          className={cn(
            'flex flex-col px-4',
            effectiveDensity === 'compact' && 'gap-3',
            effectiveDensity === 'standard' && 'gap-4',
            effectiveDensity === 'relaxed' && 'gap-5',
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

          {resolvedItem.retweetedStatus ? (
            <StatusCardView status={resolvedItem.retweetedStatus} role="quoted" />
          ) : null}
        </CardContent>
        {!isDeletedAuthor ? (
          <CardFooter className="px-4">
            <FeedActions
              item={resolvedItem}
              surface={surface}
              onCommentClick={handleCommentClick}
              onCommentExpand={handleCommentExpand}
              commentsExpanded={commentsExpanded}
              commentsPanelId={canExpandInlineComments ? commentsPanelId : undefined}
              onRepostClick={(target) => host.composeStatus(target, 'repost')}
              onLikeClick={controller.like}
              likePending={controller.likePendingId === resolvedItem.id}
              feedInteractionMode={feedInteractionMode}
              primaryActionOrder={feedPrimaryActionOrder}
              toolbarButtonIds={feedToolbarButtonIds}
              favorited={resolvedItem.favorited}
              onFavorite={() => controller.favorite(resolvedItem)}
              favoritePending={controller.favoritePendingId === resolvedItem.id}
              onCopyLink={() => handleCopyLink(resolvedItem)}
              onCopyText={() => handleCopyText(resolvedItem)}
              onGenImage={() => openGenImage(resolvedItem)}
              onDownload={() => void handleDownload()}
              downloadPending={downloadLoading}
              showInteractionCounts={showInteractionCounts}
            />
          </CardFooter>
        ) : null}
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
}
