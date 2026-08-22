import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardDescription } from '@/components/ui/card'
import { RefreshCWIcon } from '@/components/ui/refresh-cw'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import type { HotSearchType } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { hotSearchQueryOptions } from '@/lib/weibo/data/weibo-data'
import { useColumnControls } from '@/lib/weibo/workspace/column-controls'

const HOT_SEARCH_TYPES: { value: HotSearchType; label: string }[] = [
  { value: 'hot', label: '热搜' },
  { value: 'mine', label: '我的' },
  { value: 'entertainment', label: '文娱' },
  { value: 'life', label: '生活' },
  { value: 'social', label: '社会' },
]

interface HotSearchListData {
  type: HotSearchType
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

function HotSearchItemComponent({
  item,
  index,
  forceExternalLink = false,
}: {
  item: HotSearchListData
  index: number
  forceExternalLink?: boolean
}) {
  const word = normalizeWord(item.word)
  const xbTopicPage = useAppSettings((s) => s.xbTopicPage)

  const className =
    'group hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none'

  if (!xbTopicPage || forceExternalLink) {
    const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${word}#`)}`
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        <span
          className={cn(getRankClassName(index), 'w-4 shrink-0 text-xs font-medium tabular-nums')}
        >
          {index + 1}
        </span>
        <span className="text-foreground group-hover:text-foreground min-w-0 flex-1 truncate text-sm transition-colors">
          {word}
        </span>
      </a>
    )
  }

  return (
    <Link to={`/topic?q=${encodeURIComponent(word)}`} className={className}>
      <span
        className={cn(getRankClassName(index), 'w-4 shrink-0 text-xs font-medium tabular-nums')}
      >
        {index + 1}
      </span>
      <span className="text-foreground group-hover:text-foreground min-w-0 flex-1 truncate text-sm transition-colors">
        {word}
      </span>
    </Link>
  )
}

interface HotSearchCardProps {
  className?: string
  type?: HotSearchType
  showTypeSelector?: boolean
  variant?: 'rail' | 'column'
}

export function HotSearchCard({
  className,
  type,
  showTypeSelector = type === undefined,
  variant = 'rail',
}: HotSearchCardProps) {
  const columnControls = useColumnControls()
  const { hotSearchType, updateSettings } = useAppSettings(
    useShallow((s) => ({
      hotSearchType: s.hotSearchType,
      updateSettings: s.updateSettings,
    })),
  )
  const selectedType = type ?? hotSearchType

  const currentQuery = useQuery(hotSearchQueryOptions(selectedType))
  const items =
    currentQuery.data?.items.map((item) => ({
      type: item.type,
      word: item.word,
      num: item.num,
      realpos: item.realpos,
      labelName: item.labelName,
    })) ?? []

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {columnControls}
          {showTypeSelector ? (
            <Select
              value={selectedType}
              onValueChange={(value) =>
                void updateSettings({ hotSearchType: value as HotSearchType })
              }
            >
              <SelectTrigger size="sm" className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {HOT_SEARCH_TYPES.map((typeOption) => (
                    <SelectItem key={typeOption.value} value={typeOption.value}>
                      {typeOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <h2 className="truncate px-1 text-sm font-semibold">
              {HOT_SEARCH_TYPES.find((typeOption) => typeOption.value === selectedType)?.label ??
                '热搜'}
            </h2>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => currentQuery.refetch()}
          disabled={currentQuery.isFetching}
          title="刷新热搜"
        >
          <RefreshCWIcon className={cn(currentQuery.isFetching && 'animate-spin')} />
        </Button>
      </div>
      {currentQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : currentQuery.isError ? (
        <CardDescription className="px-2 pb-2">热搜加载失败</CardDescription>
      ) : items.length === 0 ? (
        <CardDescription className="px-2 pb-2">暂无热搜</CardDescription>
      ) : (
        <div
          className={cn(
            'w-full scrollbar-none overflow-x-hidden overflow-y-auto',
            variant === 'rail' && 'h-[380px]',
          )}
        >
          {items.map((item, index) => (
            <HotSearchItemComponent
              key={`${item.type}-${item.word}`}
              item={item}
              index={index}
              forceExternalLink={variant === 'column'}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
