import { ScrollArea } from '@/components/ui/scroll-area'

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

function HotSearchItemComponent({ item, index }: { item: HotSearchListData; index: number }) {
  const word = normalizeWord(item.word)
  const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${word}#`)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent transition-colors group truncate"
    >
      <span className="text-xs text-muted-foreground w-4 shrink-0">{index + 1}</span>
      <span className="text-xs truncate group-hover:text-foreground transition-colors min-w-0">
        {word}
      </span>
    </a>
  )
}

export function HotSearchList({ items }: HotSearchListProps) {
  if (items.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">暂无热搜</div>
  }

  return (
    <ScrollArea className="h-[400px] flex flex-col gap-0.5 w-full overflow-x-hidden">
      {items.map((item, index) => (
        <HotSearchItemComponent key={item.realpos || index} item={item} index={index} />
      ))}
    </ScrollArea>
  )
}
