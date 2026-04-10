import { useQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { type MouseEvent, useRef, useState } from 'react'
import { Link } from 'react-router'

import { AspectRatio } from '@/components/ui/aspect-ratio'
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
import { StatusText } from '@/features/weibo/components/status-text'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import type { FeedImage, FeedItem } from '@/features/weibo/models/feed'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'

import { VideoPlayer } from './video-player'

function formatCount(value: number) {
  if (value <= 9999) return String(value)
  return `${(value / 10000).toFixed(1)}万`
}

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
        <VideoPlayer src={item.media.streamUrl} poster={item.media.coverUrl ?? undefined} />
      </AspectRatio>
    </div>
  )
}

function FeedAuthorHeader({
  item,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
}) {
  return (
    <CardHeader className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 px-4">
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
      <div className="flex min-w-0 flex-col gap-1">
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
  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        <StatusText item={item} text={text} />

        {canLoadLongText ? (
          <Button
            className="mt-2 inline-flex"
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
      </p>
    </div>
  )
}

function useFeedLongText(item: Pick<FeedItem, 'isLongText' | 'mblogId' | 'text'>) {
  const [longTextEnabled, setLongTextEnabled] = useState(false)
  const canLoadLongText = item.isLongText
  const {
    data: longText,
    error: longTextError,
    isLoading: isLongTextLoading,
    refetch: refetchLongText,
  } = useQuery({
    queryKey: ['weibo', 'longtext', item.mblogId],
    queryFn: () => loadStatusLongText(item.mblogId!),
    enabled: longTextEnabled && canLoadLongText,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
  const resolvedText =
    longTextEnabled && longText !== undefined && longText !== '' ? longText : item.text
  const hasLongTextError = longTextError instanceof Error

  return {
    resolvedText,
    shouldShowLoadLongText: canLoadLongText && (!longTextEnabled || hasLongTextError),
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText: () => {
      if (!longTextEnabled) {
        setLongTextEnabled(true)
        return
      }

      void refetchLongText()
    },
  }
}

function FeedActions({
  item,
  onCommentClick,
  onRepostClick,
  onLikeClick,
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
  onLikeClick?: (item: FeedItem) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground w-full">
      <button
        type="button"
        aria-label="回复微博"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-left transition-colors hover:bg-sky-50 hover:text-sky-500"
        onClick={(event) => {
          event.stopPropagation()
          onCommentClick?.(item)
        }}
      >
        <MessageCircle className="size-3.5 transition-colors group-hover:text-sky-500" />
        <span className="transition-colors group-hover:text-sky-500">
          {formatCount(item.stats.comments)}
        </span>
      </button>
      <button
        type="button"
        aria-label="转发微博"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 transition-colors hover:bg-emerald-50 hover:text-emerald-500"
        onClick={(event) => {
          event.stopPropagation()
          onRepostClick?.(item)
        }}
      >
        <Repeat2 className="size-3.5 transition-colors group-hover:text-emerald-500" />
        <span className="transition-colors group-hover:text-emerald-500">
          {formatCount(item.stats.reposts)}
        </span>
      </button>
      <button
        type="button"
        aria-label="点赞微博"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 transition-colors hover:bg-rose-50 hover:text-rose-500"
        onClick={(event) => {
          event.stopPropagation()
          onLikeClick?.(item)
        }}
      >
        <Heart className="size-3.5 transition-colors group-hover:text-rose-500" />
        <span className="transition-colors group-hover:text-rose-500">
          {formatCount(item.stats.likes)}
        </span>
      </button>
    </div>
  )
}

function RetweetedFeedBlock({
  item,
  onImageClick,
}: {
  item: NonNullable<FeedItem['retweetedStatus']>
  onImageClick: (images: FeedImage[], index: number) => void
}) {
  const {
    resolvedText,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
      <RetweetedAuthorHeader item={item} />
      <FeedTextBlock
        item={item}
        text={resolvedText}
        canLoadLongText={shouldShowLoadLongText}
        isLongTextLoading={isLongTextLoading}
        hasLongTextError={hasLongTextError}
        onLoadLongText={onLoadLongText}
      />
      <div className="mt-3">
        <FeedMediaBlock item={item} />
      </div>
      <ImageCarousel images={item.images} />
    </div>
  )
}

export function FeedCard({
  item,
  onNavigate,
  onCommentClick,
  onRepostClick,
}: {
  item: FeedItem
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [startImageIndex, setStartImageIndex] = useState(0)
  /** When set, preview dialog shows this list (retweet gallery); otherwise main post `item.images`. */
  const [carouselImages, setCarouselImages] = useState<FeedImage[] | null>(null)
  const pointerDownPositionRef = useRef<{ x: number; y: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const {
    resolvedText,
    shouldShowLoadLongText,
    isLongTextLoading,
    hasLongTextError,
    onLoadLongText,
  } = useFeedLongText(item)

  const openImageDialog = (images: FeedImage[] | null, index: number) => {
    setCarouselImages(images)
    setStartImageIndex(index)
    setImageDialogOpen(true)
  }

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
    if (!onNavigate) {
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
    <>
      <Card className="gap-4 rounded-3xl" data-testid="feed-card-body">
        <FeedAuthorHeader item={item} />
        <CardContent
          className="flex flex-col gap-4"
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

          <ImageCarousel images={carouselImages ?? item.images} />

          {item.retweetedStatus ? (
            <RetweetedFeedBlock
              item={item.retweetedStatus}
              onImageClick={(images, index) => {
                openImageDialog(images, index)
              }}
            />
          ) : null}
        </CardContent>
        <CardFooter>
          <FeedActions item={item} onCommentClick={onCommentClick} onRepostClick={onRepostClick} />
        </CardFooter>
      </Card>
    </>
  )
}
