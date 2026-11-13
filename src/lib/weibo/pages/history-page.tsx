import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { BrushCleaning, CalendarDays, Clock, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppSettings } from '@/lib/app-settings-store'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import {
  browsingHistoryStore,
  type HistoryEntry,
  useBrowsingHistory,
} from '@/lib/weibo/hooks/use-browsing-history'

function getDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function getReadDateKey(timestamp: number): string {
  return getDateKey(new Date(timestamp))
}

function getTodayDateKey(): string {
  return getDateKey(new Date())
}

function formatGroupLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) {
    return '今天'
  }

  return format(new Date(`${dateKey}T00:00:00`), 'yyyy年M月d日', { locale: zhCN })
}

function formatSelectedDateLabel(date: Date | undefined): string {
  return date ? format(date, 'M月d日', { locale: zhCN }) : '全部日期'
}

function formatReadAt(timestamp: number): string {
  const date = new Date(timestamp)
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60_000) {
    return '刚刚'
  }

  if (diff < 3_600_000) {
    return formatDistanceToNow(date, { locale: zhCN, addSuffix: true })
  }

  if (diff < 86_400_000) {
    return format(date, 'HH:mm')
  }

  if (diff < 7 * 86_400_000) {
    return format(date, 'EEE HH:mm', { locale: zhCN })
  }

  return format(date, 'M月d日')
}

export function HistoryPage({ onOpenEntry }: { onOpenEntry?: (entry: HistoryEntry) => void } = {}) {
  const entries = useBrowsingHistory((s) => s.entries)
  const browsingHistoryLimit = useAppSettings((s) => s.browsingHistoryLimit)
  const removeEntry = browsingHistoryStore.getState().removeEntry
  const clearHistory = browsingHistoryStore.getState().clearHistory
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()

  const selectedDateKey = selectedDate ? getDateKey(selectedDate) : undefined
  const visibleEntries = useMemo(() => {
    if (!selectedDateKey) {
      return entries
    }

    return entries.filter((entry) => getReadDateKey(entry.readAt) === selectedDateKey)
  }, [entries, selectedDateKey])

  const groupedEntries = useMemo(() => {
    const todayKey = getTodayDateKey()
    const groupMap = new Map<string, typeof entries>()

    for (const entry of visibleEntries) {
      const dateKey = getReadDateKey(entry.readAt)
      const group = groupMap.get(dateKey)

      if (group) {
        group.push(entry)
      } else {
        groupMap.set(dateKey, [entry])
      }
    }

    return Array.from(groupMap, ([dateKey, groupEntries]) => ({
      label: formatGroupLabel(dateKey, todayKey),
      entries: groupEntries,
    }))
  }, [visibleEntries])

  const hasDateFilter = Boolean(selectedDate)

  return (
    <div className="flex flex-col gap-3">
      <TimelineTopBar
        title="浏览历史"
        description={
          hasDateFilter
            ? `${formatSelectedDateLabel(selectedDate)}，共 ${visibleEntries.length} 条`
            : `最多保存 ${browsingHistoryLimit} 条`
        }
        rightAction={
          entries.length > 0 ? (
            <>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={hasDateFilter ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-label="选择浏览日期"
                  >
                    <CalendarDays />
                    <span className="hidden sm:inline">
                      {formatSelectedDateLabel(selectedDate)}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-2">
                  <div className="flex flex-col gap-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      locale={zhCN}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        setDatePickerOpen(false)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!hasDateFilter}
                      onClick={() => {
                        setSelectedDate(undefined)
                        setDatePickerOpen(false)
                      }}
                    >
                      查看全部
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <BrushCleaning />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>清空浏览历史？</DialogTitle>
                    <DialogDescription>
                      这会删除 xb 保存的全部浏览记录，删除后无法恢复。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">保留历史</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        clearHistory()
                        setClearConfirmOpen(false)
                      }}
                    >
                      清空历史
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
          <Clock className="size-8 opacity-50" />
          <p className="text-sm">暂无浏览历史</p>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
          <CalendarDays className="size-8 opacity-50" />
          <p className="text-sm">这一天没有浏览历史</p>
        </div>
      ) : (
        <ItemGroup>
          {groupedEntries.map((group) => (
            <div key={group.label}>
              <ItemHeader className="px-4 py-2">
                <ItemTitle className="text-muted-foreground text-xs font-medium">
                  {group.label}
                </ItemTitle>
              </ItemHeader>
              {group.entries.map((entry) => {
                const to =
                  entry.statusId && entry.authorId
                    ? `/${entry.authorId}/${entry.statusId}`
                    : `/u/${entry.authorId}`
                const content = (
                  <>
                    <ItemMedia variant="image">
                      <Avatar className="size-9">
                        {entry.authorAvatar && <AvatarImage src={entry.authorAvatar} />}
                        <AvatarFallback className="text-xs">
                          {entry.authorName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        <span>{entry.authorName}</span>
                        <span className="text-muted-foreground ml-auto text-xs font-normal">
                          {formatReadAt(entry.readAt)}
                        </span>
                      </ItemTitle>
                      <ItemDescription>{entry.textSnippet}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeEntry(entry.id)
                        }}
                        aria-label="移除"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </ItemActions>
                  </>
                )
                return (
                  <Item key={entry.id} asChild size="sm">
                    {onOpenEntry ? (
                      <button type="button" onClick={() => onOpenEntry(entry)}>
                        {content}
                      </button>
                    ) : (
                      <Link to={to}>{content}</Link>
                    )}
                  </Item>
                )
              })}
            </div>
          ))}
        </ItemGroup>
      )}
    </div>
  )
}
