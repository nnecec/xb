import { cn } from 'cn'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarDays, Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  beijingDateStartTimestamp,
  beijingInclusiveEndDateTimestamp,
  dateFromBeijingInclusiveEndtime,
  dateFromBeijingTimestamp,
  defaultProfileSearchEndtime,
  DEFAULT_PROFILE_SEARCH_FILTERS,
  type ProfileSearchFilterKey,
  PROFILE_SEARCH_FILTER_KEYS,
  type ProfileSearchFilters,
  type ProfileSearchParams,
  type ProfileSearchUrlState,
} from '@/lib/weibo/route/profile-search-params'

const FILTER_LABELS: Record<ProfileSearchFilterKey, string> = {
  hasori: '原创',
  hasret: '转发',
  hastext: '文字',
  haspic: '图片',
  hasvideo: '视频',
  hasmusic: '音乐',
}

function formatDateLabel(date: Date): string {
  return format(date, 'yyyy年M月d日', { locale: zhCN })
}

function selectedFilterCount(filters: ProfileSearchFilters): number {
  return PROFILE_SEARCH_FILTER_KEYS.filter((key) => filters[key]).length
}

function DateFilterField({
  label,
  valueLabel,
  open,
  onOpenChange,
  children,
}: {
  label: string
  valueLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary" size="sm" aria-label={label}>
            <CalendarDays data-icon="inline-start" />
            <span>{valueLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto p-2"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function resultLabel(isSearching: boolean, resultTotal: string | undefined): string {
  if (isSearching) {
    return '检索中'
  }

  if (resultTotal) {
    return `已检索 ${resultTotal} 条`
  }

  return '检索结果'
}

function getInitialDates(params: ProfileSearchParams): {
  startDate: Date | undefined
  endDate: Date
} {
  const endDate = dateFromBeijingInclusiveEndtime(params.endtime)
  const startDate =
    params.starttime === null ? undefined : dateFromBeijingTimestamp(params.starttime)

  return {
    startDate,
    endDate,
  }
}

function dateRangeLabel(startDate: Date | undefined, endDate: Date): string {
  if (startDate) {
    return `${formatDateLabel(startDate)} 至 ${formatDateLabel(endDate)}`
  }

  const today = dateFromBeijingInclusiveEndtime(defaultProfileSearchEndtime())
  return endDate.toDateString() === today.toDateString()
    ? '截止今天'
    : `截止 ${formatDateLabel(endDate)}`
}

interface ProfileSearchBarProps {
  state: ProfileSearchUrlState
  resultTotal?: string
  isSearching?: boolean
  onSubmit: (params: ProfileSearchParams) => void
  onClear: () => void
}

export function ProfileSearchBar({
  state,
  resultTotal,
  isSearching = false,
  onSubmit,
  onClear,
}: ProfileSearchBarProps) {
  const initialDates = getInitialDates(state.params)
  const [query, setQuery] = useState(state.params.query)
  const [filters, setFilters] = useState<ProfileSearchFilters>(state.params.filters)
  const [startDate, setStartDate] = useState<Date | undefined>(initialDates.startDate)
  const [endDate, setEndDate] = useState<Date>(initialDates.endDate)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openDateField, setOpenDateField] = useState<'start' | 'end' | null>(null)
  const count = selectedFilterCount(filters)
  const allFiltersSelected = count === PROFILE_SEARCH_FILTER_KEYS.length

  const submitSearch = () => {
    onSubmit({
      query,
      starttime: startDate ? beijingDateStartTimestamp(startDate) : null,
      endtime: beijingInclusiveEndDateTimestamp(endDate),
      filters,
    })
  }

  const toggleFilter = (key: ProfileSearchFilterKey, checked: boolean) => {
    if (!checked && filters[key] && count <= 1) {
      return
    }

    setFilters((current) => ({
      ...current,
      [key]: checked,
    }))
  }

  const resetFilters = () => {
    setFilters({ ...DEFAULT_PROFILE_SEARCH_FILTERS })
  }

  return (
    <form
      className={cn('flex flex-col gap-2 border-b px-4 py-3', state.active && 'bg-muted/35')}
      onSubmit={(event) => {
        event.preventDefault()
        submitSearch()
      }}
    >
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="bg-background border-border/60 focus-within:border-ring/60 focus-within:ring-ring/20 relative min-w-0 rounded-lg border transition-[border-color,box-shadow] focus-within:ring-[3px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            size={6}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 TA 的微博"
            aria-label="搜索 TA 的微博"
            className="border-0 pr-3 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 p-1">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="高级筛选">
                <SlidersHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-auto p-3"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
              onInteractOutside={(event) => {
                const target = event.target
                if (target instanceof Element && target.closest('[data-slot="popover-content"]')) {
                  event.preventDefault()
                }
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs">类型</p>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={allFiltersSelected}
                      onCheckedChange={(checked) => {
                        if (checked) resetFilters()
                      }}
                    />
                    全部
                  </label>
                  {PROFILE_SEARCH_FILTER_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={filters[key]}
                        disabled={filters[key] && count <= 1}
                        onCheckedChange={(checked) => toggleFilter(key, checked === true)}
                      />
                      {FILTER_LABELS[key]}
                    </label>
                  ))}
                </div>
                <DateFilterField
                  label="开始时间"
                  valueLabel={startDate ? formatDateLabel(startDate) : '不限'}
                  open={openDateField === 'start'}
                  onOpenChange={(open) => setOpenDateField(open ? 'start' : null)}
                >
                  <div className="flex flex-col gap-2">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      locale={zhCN}
                      captionLayout="dropdown"
                      disabled={(date) => date > endDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setOpenDateField(null)
                      }}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!startDate}
                        onClick={() => setStartDate(undefined)}
                      >
                        清除
                      </Button>
                    </div>
                  </div>
                </DateFilterField>
                <DateFilterField
                  label="结束时间"
                  valueLabel={formatDateLabel(endDate)}
                  open={openDateField === 'end'}
                  onOpenChange={(open) => setOpenDateField(open ? 'end' : null)}
                >
                  <Calendar
                    mode="single"
                    selected={endDate}
                    locale={zhCN}
                    captionLayout="dropdown"
                    disabled={(date) => (startDate ? date < startDate : false)}
                    onSelect={(date) => {
                      if (!date) return
                      setEndDate(date)
                      setOpenDateField(null)
                    }}
                  />
                </DateFilterField>
              </div>
            </PopoverContent>
          </Popover>
          <Button type="submit" disabled={isSearching}>
            搜索
          </Button>
          {state.active ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="退出搜索"
              onClick={onClear}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      {state.active ? (
        <div className="text-muted-foreground flex min-h-5 items-center justify-between gap-2 px-1 text-xs">
          <span className="truncate">
            {query ? `"${query}"` : '空关键词'}，{dateRangeLabel(startDate, endDate)}
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            {resultLabel(isSearching, resultTotal)}
          </span>
        </div>
      ) : null}
    </form>
  )
}
