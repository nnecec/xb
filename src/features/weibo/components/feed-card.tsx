import { useQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { ImageGrid } from '@/features/weibo/components/image-grid'
import { StatusText } from '@/features/weibo/components/status-text'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/features/weibo/components/user-presenter'
import type { FeedImage, FeedItem } from '@/features/weibo/models/feed'
import { loadStatusLongText } from '@/features/weibo/services/weibo-repository'

function formatCount(value: number) {
  if (value <= 9999) return String(value)
  return `${(value / 10000).toFixed(1)}万`
}

function FeedMediaBlock({ item }: { item: FeedItem }) {
  if (!item.media) {
    return null
  }

  return item.media.type === 'audio' ? (
    <audio controls src={item.media.streamUrl} className="w-full" />
  ) : (
    <AspectRatio ratio={16 / 9}>
      <video
        controls
        src={item.media.streamUrl}
        poster={item.media.coverUrl ?? undefined}
        className="w-full rounded-xl object-contain h-full"
      />
    </AspectRatio>
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
        <Link to={`/n/${encodeURIComponent(item.author.name)}`}>
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
            <Link to={`/n/${encodeURIComponent(item.author.name)}`}>
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
        <button type="button" className="cursor-pointer">
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
            <button type="button" className="cursor-pointer text-left">
              <p className="truncate text-sm font-medium text-foreground hover:underline">
                @{item.author.name}
              </p>
            </button>
          </UserHoverCard>
          <CreatedAtBadge label={item.createdAtLabel} />
        </div>
        <p className="text-xs text-muted-foreground">
          {item.source ? `${item.source}` : ''} {item.regionName ? `· ${item.regionName}` : ''}
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
      </p>
      {canLoadLongText ? (
        <Button
          className="mt-2"
          size="xs"
          variant="secondary"
          onClick={onLoadLongText}
          disabled={isLongTextLoading}
        >
          {isLongTextLoading ? '加载中...' : hasLongTextError ? '重试全文' : '全文'}
        </Button>
      ) : null}
    </div>
  )
}

function useFeedLongText(item: Pick<FeedItem, 'isLongText' | 'mblogId' | 'text'>) {
  const [longTextEnabled, setLongTextEnabled] = useState(false)
  const canLoadLongText = item.isLongText && Boolean(item.mblogId)
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
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
      <button
        type="button"
        className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-left"
        onClick={() => onCommentClick?.(item)}
      >
        <MessageCircle className="size-3.5" />
        <span>{formatCount(item.stats.comments)}</span>
      </button>
      <div className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2">
        <Repeat2 className="size-3.5" />
        <span>{formatCount(item.stats.reposts)}</span>
      </div>
      <div className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2">
        <Heart className="size-3.5" />
        <span>{formatCount(item.stats.likes)}</span>
      </div>
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
      <ImageGrid
        images={item.images}
        className="mt-3 grid grid-cols-3 gap-2"
        onImageClick={(index) => onImageClick(item.images, index)}
      />
    </div>
  )
}

export function FeedCard({
  item,
  onCommentClick,
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [startImageIndex, setStartImageIndex] = useState(0)
  /** When set, preview dialog shows this list (retweet gallery); otherwise main post `item.images`. */
  const [carouselImages, setCarouselImages] = useState<FeedImage[] | null>(null)
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

  return (
    <>
      <Card className="gap-4 rounded-[28px] border-border/70 bg-card/95 py-4 shadow-none">
        <FeedAuthorHeader item={item} />
        <CardContent className="flex flex-col gap-4 px-4">
          <FeedTextBlock
            item={item}
            text={resolvedText}
            canLoadLongText={shouldShowLoadLongText}
            isLongTextLoading={isLongTextLoading}
            hasLongTextError={hasLongTextError}
            onLoadLongText={onLoadLongText}
          />

          <FeedMediaBlock item={item} />

          <ImageGrid
            images={item.images}
            onImageClick={(index) => {
              openImageDialog(null, index)
            }}
          />

          {item.retweetedStatus ? (
            <RetweetedFeedBlock
              item={item.retweetedStatus}
              onImageClick={(images, index) => {
                openImageDialog(images, index)
              }}
            />
          ) : null}

          <FeedActions item={item} onCommentClick={onCommentClick} />
        </CardContent>
      </Card>

      <ImageCarousel
        images={carouselImages ?? item.images}
        startIndex={startImageIndex}
        open={imageDialogOpen}
        onOpenChange={(open) => {
          setImageDialogOpen(open)
          if (!open) setCarouselImages(null)
        }}
      />
    </>
  )
}
