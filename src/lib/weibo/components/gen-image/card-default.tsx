import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { StatusText } from '@/lib/weibo/components/status-text'

import type { ShareCardProps } from './types'
import { formatCount, formatDate, getDisplayImages } from './utils'

function getAuthorInitial(name: string | null | undefined) {
  return name?.slice(0, 1).toUpperCase() || '?'
}

function ShareCardAvatar({
  author,
  sizeClassName,
  fallbackClassName,
}: {
  author: ShareCardProps['data']['author']
  sizeClassName: string
  fallbackClassName: string
}) {
  return (
    <Avatar className={sizeClassName}>
      <AvatarImage src={author.avatarUrl ?? undefined} alt={author.name} />
      <AvatarFallback className={fallbackClassName}>{getAuthorInitial(author.name)}</AvatarFallback>
    </Avatar>
  )
}

function ShareCardActions({
  stats,
  className,
}: {
  stats: ShareCardProps['data']['stats']
  className?: string
}) {
  return (
    <div className={cn('flex w-full gap-4 text-xs', className)}>
      <div className="flex items-center gap-1.5 py-2">
        <MessageCircle className="size-3.5" />
        <span>{formatCount(stats.comments)}</span>
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <Repeat2 className="size-3.5" />
        <span>{formatCount(stats.reposts)}</span>
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <Heart className="size-3.5" />
        <span>{formatCount(stats.likes)}</span>
      </div>
    </div>
  )
}

function ShareCardImages({
  images,
  videoCoverUrl,
  showFullImages,
}: {
  images: ShareCardProps['data']['images']
  videoCoverUrl?: string | null
  showFullImages?: boolean
}) {
  const displayImages = getDisplayImages(images, videoCoverUrl)

  if (displayImages.length === 0) {
    return null
  }

  if (showFullImages) {
    return (
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
    )
  }

  return (
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

function RetweetedShareCard({
  data,
}: {
  data: NonNullable<ShareCardProps['data']['retweetedStatus']>
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 px-4">
        <ShareCardAvatar
          author={data.author}
          sizeClassName="size-9"
          fallbackClassName="text-xs font-semibold"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{data.author.name}</span>
            <span className="text-muted-foreground text-xs">{formatDate(data.createdAt)}</span>
          </div>
          <p className="text-xs">
            {data.source ? `${data.source}` : ''} {data.regionName ? `${data.regionName}` : ''}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="text-sm leading-6">
          <StatusText item={data} text={data.text} />
        </div>
        <ShareCardImages images={data.images} videoCoverUrl={data.videoCoverUrl} />
        <ShareCardActions stats={data.stats} />
      </CardContent>
    </Card>
  )
}

export function CardDefault({
  data,
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  return (
    <div className="p-4">
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row gap-3 px-4">
          <ShareCardAvatar
            author={data.author}
            sizeClassName="size-12"
            fallbackClassName="text-sm font-semibold"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{data.author.name}</CardTitle>
              <span className="text-muted-foreground text-xs">{formatDate(data.createdAt)}</span>
            </div>
            <CardDescription className="text-xs">
              {data.source ? `${data.source}` : ''} {data.regionName ? `${data.regionName}` : ''}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <div className="text-sm leading-6">
            <StatusText item={data} text={data.text} />
          </div>
          <ShareCardImages
            images={data.images}
            videoCoverUrl={data.videoCoverUrl}
            showFullImages={showFullImages}
          />
          {data.retweetedStatus ? <RetweetedShareCard data={data.retweetedStatus} /> : null}
        </CardContent>
        {showStats && (
          <CardFooter className="flex justify-between px-4">
            <div className="flex flex-col gap-1">
              <ShareCardActions stats={data.stats} />
              {showLink && data.mblogId && (
                <div className="text-muted-foreground flex w-full items-center gap-1 text-xs">
                  <Link className="size-3" />
                  <span>
                    https://weibo.com/{data.author.id}/{data.mblogId}
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
}
