import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useCallback } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RefreshCWIcon } from '@/components/ui/refresh-cw'
import { Spinner } from '@/components/ui/spinner'
import { followedSuperTopicsQueryOptions } from '@/lib/weibo/data/weibo-data'
import type { SuperTopicItem } from '@/lib/weibo/models/super-topic'
import { useColumnPageRefresh } from '@/lib/weibo/workspace/column-page-toolbar'

function SuperTopicItemLink({ item }: { item: SuperTopicItem }) {
  const fallback = item.title.trim().slice(0, 1) || '#'
  const className =
    'group hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none'
  const content = (
    <>
      <Avatar size="sm" className="size-8">
        <AvatarImage src={item.pic} alt={item.title} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground truncate text-sm leading-tight font-medium">
          {item.title}
        </span>
        <span className="text-muted-foreground truncate text-xs leading-tight">
          {item.fansText || item.intro || '超话'}
        </span>
      </span>
    </>
  )

  if (!item.link) {
    return (
      <div className={className} title={item.title}>
        {content}
      </div>
    )
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={item.title}
    >
      {content}
    </a>
  )
}

interface SuperTopicCardProps {
  className?: string
  variant?: 'rail' | 'column'
}

export function SuperTopicCard({ className, variant = 'rail' }: SuperTopicCardProps) {
  const superTopicsQuery = useQuery(followedSuperTopicsQueryOptions)
  const items = superTopicsQuery.data?.items ?? []
  const title = superTopicsQuery.data?.name ?? '我关注的超话'
  const refetchSuperTopics = superTopicsQuery.refetch
  const refreshSuperTopics = useCallback(() => {
    void refetchSuperTopics()
  }, [refetchSuperTopics])
  useColumnPageRefresh(
    refreshSuperTopics,
    superTopicsQuery.isFetching && !superTopicsQuery.isLoading,
  )

  const shellClassName = cn(
    'flex flex-col',
    variant === 'rail' && 'gap-2 rounded-xl border bg-card py-2 text-card-foreground',
    variant === 'column' && 'min-h-0 flex-1',
    className,
  )
  const statusClassName = 'text-muted-foreground px-2 pb-2 text-sm'

  return (
    <div data-slot={variant === 'rail' ? 'card' : undefined} className={shellClassName}>
      {variant === 'column' ? (
        items.length > 0 ? (
          <p className="text-muted-foreground px-1 text-xs">{items.length} 个</p>
        ) : null
      ) : (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0">
              <h2 className="truncate text-sm leading-tight font-semibold">{title}</h2>
              {items.length > 0 && (
                <p className="text-muted-foreground mt-0.5 text-xs leading-tight">
                  {items.length} 个
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => superTopicsQuery.refetch()}
            disabled={superTopicsQuery.isFetching}
            title="刷新超话"
          >
            <RefreshCWIcon className={cn(superTopicsQuery.isFetching && 'animate-spin')} />
          </Button>
        </div>
      )}
      {superTopicsQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : superTopicsQuery.isError ? (
        <p className={statusClassName}>超话加载失败</p>
      ) : items.length === 0 ? (
        <p className={statusClassName}>暂无关注的超话</p>
      ) : (
        <div
          className={cn(
            'w-full',
            variant === 'rail' && 'scrollbar-none max-h-[180px] overflow-x-hidden overflow-y-auto',
          )}
        >
          {items.map((item) => (
            <SuperTopicItemLink key={item.oid || item.link || item.title} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
