import { Link } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusText } from '@/lib/weibo/components/status-text'

import {
  formatDate,
  RetweetedShareCard,
  ShareCardActions,
  ShareCardAvatar,
  ShareCardImages,
} from './share-card-content'
import type { ShareCardProps } from './types'

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
              <CardTitle className="truncate">{data.author.name}</CardTitle>
              <span className="text-muted-foreground text-xs">{formatDate(data.createdAt)}</span>
            </div>
            <CardDescription>
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
          {data.retweetedStatus ? (
            <RetweetedShareCard
              data={data.retweetedStatus}
              showStats={showStats}
              showFullImages={showFullImages}
            />
          ) : null}
        </CardContent>
        {(showStats || (showLink && data.mblogId)) && (
          <CardFooter className="flex justify-between px-4">
            <div className="flex flex-col gap-1">
              {showStats ? <ShareCardActions stats={data.stats} /> : null}
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
