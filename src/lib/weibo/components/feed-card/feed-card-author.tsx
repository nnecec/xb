import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import { CreatedAtBadge, UserAvatar } from '@/lib/weibo/components/user-presenter'
import type { FeedItem } from '@/lib/weibo/models/feed'

export function FeedAuthorHeader({
  item,
  trailing,
  hideAvatar = false,
  showTimestamp = true,
  showPublishInfo = true,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
  trailing?: ReactNode
  hideAvatar?: boolean
  showTimestamp?: boolean
  showPublishInfo?: boolean
}) {
  return (
    <CardHeader className="flex flex-row gap-3 px-4">
      {!hideAvatar ? (
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
      ) : null}
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
              {showTimestamp ? <CreatedAtBadge label={item.createdAtLabel} /> : null}
              {trailing ? (
                <div
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {trailing}
                </div>
              ) : null}
            </div>
            {showPublishInfo && (item.source || item.regionName) ? (
              <CardDescription className="text-xs">
                {[item.source, item.regionName].filter(Boolean).join(' ')}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </div>
    </CardHeader>
  )
}

export function RetweetedAuthorHeader({
  item,
  hideAvatar = false,
  showTimestamp = true,
  showPublishInfo = true,
}: {
  item: Pick<FeedItem, 'author' | 'createdAtLabel' | 'source' | 'regionName'>
  hideAvatar?: boolean
  showTimestamp?: boolean
  showPublishInfo?: boolean
}) {
  const isDeletedAuthor = !item.author.id

  if (isDeletedAuthor) {
    return <div className="text-muted-foreground text-sm">未知用户</div>
  }

  return (
    <div className={hideAvatar ? 'grid grid-cols-1' : 'grid grid-cols-[36px_minmax(0,1fr)] gap-2'}>
      {!hideAvatar ? (
        <UserHoverCard uid={item.author.id}>
          <button
            type="button"
            className="cursor-pointer"
            aria-label={`${item.author.name} 的主页`}
            onClick={(event) => event.stopPropagation()}
          >
            <UserAvatar
              author={item.author}
              sizeClassName="size-9"
              fallbackClassName="text-xs font-semibold"
            />
          </button>
        </UserHoverCard>
      ) : null}
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
          {showTimestamp ? <CreatedAtBadge label={item.createdAtLabel} /> : null}
        </div>
        {showPublishInfo && (item.source || item.regionName) ? (
          <p className="text-muted-foreground text-xs">
            {[item.source, item.regionName].filter(Boolean).join(' ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
