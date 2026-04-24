import { format } from 'date-fns'
import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'
import * as React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAppSettings } from '@/lib/app-settings-store'
import { UserAvatar } from '@/lib/weibo/components/user-presenter'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

import { StatusText } from './status-text'

export type GenImageCardTheme = 'light' | 'dark'

interface GenImageCardProps {
  item: FeedItem
  className?: string
  theme?: GenImageCardTheme
}

export const GenImageCard = React.forwardRef<HTMLDivElement, GenImageCardProps>(
  function GenImageCard({ item, theme = 'light' }, ref) {
    const imageGenShowFullImages = useAppSettings((s) => s.imageGenShowFullImages)
    const imageGenShowDataArea = useAppSettings((s) => s.imageGenShowDataArea)
    const imageGenShowWeiboLink = useAppSettings((s) => s.imageGenShowWeiboLink)

    const cardStyle =
      theme === 'dark'
        ? ({
            '--background': 'oklch(0.145 0 0)',
            '--foreground': 'oklch(0.985 0 0)',
            '--card': 'oklch(0.145 0 0)',
            '--card-foreground': 'oklch(0.985 0 0)',
          } as React.CSSProperties)
        : ({
            '--background': 'oklch(1 0 0)',
            '--foreground': 'oklch(0.145 0 0)',
            '--card': 'oklch(1 0 0)',
            '--card-foreground': 'oklch(0.145 0 0)',
          } as React.CSSProperties)

    return (
      <div className="bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 p-4" ref={ref}>
        <Card className="gap-4 py-4" style={cardStyle}>
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
            <GenImageCardFullImages images={item.images} showFullImages={imageGenShowFullImages} />
          </CardContent>
          {imageGenShowDataArea && (
            <CardFooter className="flex flex-col gap-1 px-4">
              <GenImageCardActions item={item} />
              {imageGenShowWeiboLink && item.mblogId && (
                <div className="text-muted-foreground flex w-full items-center gap-1 text-xs">
                  <Link className="size-3" />
                  <span>
                    https://weibo.com/{item.author.id}/{item.mblogId}
                  </span>
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    )
  },
)

function GenImageCardActions({ item }: { item: Pick<FeedItem, 'stats'> }) {
  return (
    <div className="text-muted-foreground flex w-full gap-2 text-xs">
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

interface GenImageCardFullImagesProps {
  images: FeedItem['images']
  showFullImages: boolean
}

function GenImageCardFullImages({ images, showFullImages }: GenImageCardFullImagesProps) {
  if (images.length === 0) {
    return null
  }

  return showFullImages ? (
    <div className="flex flex-col gap-2">
      {images.map((image) => (
        <div
          key={image.thumbnailUrl}
          className="border-foreground/10 relative overflow-hidden rounded-xl border"
        >
          <img src={image.largeUrl} className="w-full object-contain" alt="" />
        </div>
      ))}
    </div>
  ) : (
    <div
      className={`grid gap-2 ${
        images.length === 1
          ? 'grid-cols-1'
          : images.length <= 4
            ? 'grid-cols-2'
            : images.length <= 9
              ? 'grid-cols-3'
              : 'grid-cols-4'
      }`}
    >
      {images.map((image) => (
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
