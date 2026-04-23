import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { hotSearchQueryOptions } from '@/lib/weibo/queries/weibo-queries'
import { formatWeiboCount } from '@/lib/weibo/utils/format-weibo-count'

export interface HotSearchListData {
  word: string
  num: number
  realpos: number
  labelName: string
}

function normalizeWord(word: string): string {
  return word.replace(/^#/, '').replace(/#$/, '')
}

function getRankClassName(index: number): string {
  if (index === 0) return 'text-orange-500'
  if (index === 1) return 'text-amber-500'
  if (index === 2) return 'text-blue-500'
  return 'text-muted-foreground'
}

function HotSearchItemComponent({ item, index }: { item: HotSearchListData; index: number }) {
  const word = normalizeWord(item.word)
  const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${word}#`)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:ring-ring/50 flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={cn(getRankClassName(index), 'w-4 shrink-0 text-xs font-medium tabular-nums')}
      >
        {index + 1}
      </span>
      <span className="text-foreground group-hover:text-foreground min-w-0 flex-1 truncate text-sm transition-colors">
        {word}
      </span>
      {item.num > 0 ? (
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {formatWeiboCount(item.num)}
        </span>
      ) : null}
    </a>
  )
}

interface HotSearchCardProps {
  className?: string
}

export function HotSearchCard({ className }: HotSearchCardProps) {
  const hotSearchQuery = useQuery(hotSearchQueryOptions)
  const items =
    hotSearchQuery.data?.items.map((item) => ({
      word: item.word,
      num: item.num,
      realpos: item.realpos,
      labelName: item.labelName,
    })) ?? []

  return (
    <Card className={className}>
      <div className="flex items-center justify-between pl-2">
        <span className="text-muted-foreground text-sm font-medium">热搜</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => hotSearchQuery.refetch()}
          disabled={hotSearchQuery.isFetching}
          title="刷新热搜"
        >
          <RefreshCw className={cn(hotSearchQuery.isFetching && 'animate-spin')} />
        </Button>
      </div>
      {hotSearchQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : hotSearchQuery.isError ? (
        <CardDescription className="px-2 pb-2">热搜加载失败</CardDescription>
      ) : items.length === 0 ? (
        <CardDescription className="px-2 pb-2">暂无热搜</CardDescription>
      ) : (
        <ScrollArea className="h-[400px] w-full overflow-x-hidden">
          {items.map((item, index) => (
            <HotSearchItemComponent key={item.realpos || index} item={item} index={index} />
          ))}
        </ScrollArea>
      )}
    </Card>
  )
}
