import { ScrollArea } from '@/components/ui/scroll-area'
import { formatWeiboCount } from '@/features/weibo/utils/format-weibo-count'

export interface HotSearchListData {
  word: string
  num: number
  realpos: number
  labelName: string
}

interface HotSearchListProps {
  items: HotSearchListData[]
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
      className="group flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className={getRankClassName(index) + ' w-4 shrink-0 text-xs font-medium tabular-nums'}>
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors group-hover:text-foreground">
        {word}
      </span>
      {item.num > 0 ? (
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {formatWeiboCount(item.num)}
        </span>
      ) : null}
    </a>
  )
}

export function HotSearchList({ items }: HotSearchListProps) {
  if (items.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">暂无热搜</div>
  }

  return (
    <ScrollArea className="h-[400px] w-full overflow-x-hidden">
      {items.map((item, index) => (
        <HotSearchItemComponent key={item.realpos || index} item={item} index={index} />
      ))}
    </ScrollArea>
  )
}
