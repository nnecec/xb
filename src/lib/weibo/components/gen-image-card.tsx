import { format } from 'date-fns'
import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'
import * as React from 'react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type GenImageCardTheme } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/lib/weibo/components/user-presenter'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

import { StatusText } from './status-text'

function GenImageCardActions({
  item,
  className,
}: {
  item: Pick<FeedItem, 'stats'>
  className?: string
}) {
  return (
    <div className={cn('flex w-full gap-4 text-xs', className)}>
      <div className="flex items-center gap-1.5 py-2">
        <MessageCircle className="size-3.5" />
        <span>{formatWeiboCount(item.stats.comments)}</span>
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <Repeat2 className="size-3.5" />
        <span>{formatWeiboCount(item.stats.reposts)}</span>
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <Heart className="size-3.5" />
        <span>{formatWeiboCount(item.stats.likes)}</span>
      </div>
    </div>
  )
}

function RetweetedGenImageCard({ item }: { item: NonNullable<FeedItem['retweetedStatus']> }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 px-4">
        <UserAvatar
          author={item.author}
          sizeClassName="size-9"
          fallbackClassName="text-xs font-semibold"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{item.author.name}</span>
            <span className="text-muted-foreground text-xs">
              {format(item.createdAt, 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
          <p className="text-xs">
            {item.source ? `${item.source}` : ''} {item.regionName ? `${item.regionName}` : ''}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="text-sm leading-6 whitespace-pre-wrap">
          <StatusText item={item} text={item.text} />
        </div>
        <GenImageCardFullImages images={item.images} />
        <GenImageCardActions item={item} />
      </CardContent>
    </Card>
  )
}

interface GenImageCardProps {
  item: FeedItem
  className?: string
  theme?: GenImageCardTheme
}

export const GenImageCard = React.forwardRef<HTMLDivElement, GenImageCardProps>(
  function GenImageCard({ item, theme = 'light' }, ref) {
    const imageGenShowDataArea = useAppSettings((s) => s.imageGenShowDataArea)
    const imageGenShowWeiboLink = useAppSettings((s) => s.imageGenShowWeiboLink)

    const cardStyle =
      theme === 'dark'
        ? ({
            '--background': 'oklch(0.145 0 0)',
            '--foreground': 'oklch(0.985 0 0)',
            '--card': 'oklch(0.145 0 0)',
            '--card-foreground': 'oklch(0.985 0 0)',
            '--muted': 'oklch(0.269 0 0)',
            '--muted-foreground': 'oklch(0.708 0 0)',
          } as React.CSSProperties)
        : ({
            '--background': 'oklch(1 0 0)',
            '--foreground': 'oklch(0.145 0 0)',
            '--card': 'oklch(1 0 0)',
            '--card-foreground': 'oklch(0.145 0 0)',
            '--muted': 'oklch(0.97 0 0)',
            '--muted-foreground': 'oklch(0.556 0 0)',
          } as React.CSSProperties)

    return (
      <div className="bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 p-4" ref={ref}>
        <Card className="gap-4 py-4 shadow-lg" style={cardStyle}>
          <CardHeader className="flex flex-row gap-3 px-4">
            <UserAvatar
              author={item.author}
              sizeClassName="size-12"
              fallbackClassName="text-sm font-semibold"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-base">{item.author.name}</CardTitle>
                <span className="text-muted-foreground text-xs">
                  {format(item.createdAt, 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
              <CardDescription className="text-xs">
                {item.source ? `${item.source}` : ''} {item.regionName ? `${item.regionName}` : ''}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <StatusText item={item} text={item.text} />
            <GenImageCardFullImages images={item.images} videoCoverUrl={item.media?.coverUrl} />
            {item.retweetedStatus ? <RetweetedGenImageCard item={item.retweetedStatus} /> : null}
          </CardContent>
          {imageGenShowDataArea && (
            <CardFooter className="flex justify-between px-4">
              <div className="flex flex-col gap-1">
                <GenImageCardActions item={item} />
                {imageGenShowWeiboLink && item.mblogId && (
                  <div className="text-muted-foreground flex w-full items-center gap-1 text-xs">
                    <Link className="size-3" />
                    <span>
                      https://weibo.com/{item.author.id}/{item.mblogId}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <img src={WeiboLogo} alt="微博 Logo" className="size-9" />
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  },
)

interface GenImageCardFullImagesProps {
  images: FeedItem['images']
  videoCoverUrl?: string | null
}

function GenImageCardFullImages({ images, videoCoverUrl }: GenImageCardFullImagesProps) {
  const imageGenShowFullImages = useAppSettings((s) => s.imageGenShowFullImages)

  if (images.length === 0 && !videoCoverUrl) {
    return null
  }

  // Use video cover when no images available
  const displayImages =
    images.length > 0
      ? images
      : videoCoverUrl
        ? [{ thumbnailUrl: videoCoverUrl, largeUrl: videoCoverUrl, id: 'video-cover' }]
        : []

  return imageGenShowFullImages ? (
    <div className="flex flex-col gap-2">
      {displayImages.map((image) => (
        <div
          key={image.thumbnailUrl}
          className="border-foreground/10 relative overflow-hidden rounded-xl border"
        >
          <img src={image.largeUrl} className="w-full object-contain" alt="" width="100%" />
        </div>
      ))}
    </div>
  ) : (
    <div
      className={`grid gap-2 ${
        displayImages.length === 1
          ? 'grid-cols-1'
          : displayImages.length <= 4
            ? 'grid-cols-2'
            : displayImages.length <= 9
              ? 'grid-cols-3'
              : 'grid-cols-4'
      }`}
    >
      {displayImages.map((image) => (
        <div
          key={image.thumbnailUrl}
          className="border-foreground/10 relative overflow-hidden rounded-xl border"
        >
          <img src={image.largeUrl} className="aspect-square w-full object-cover" alt="" />
        </div>
      ))}
    </div>
  )
}
