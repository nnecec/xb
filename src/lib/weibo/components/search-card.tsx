import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowUpRightIcon, Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { searchQueryOptions } from '@/lib/weibo/data/weibo-data'
import type { SearchHotQueryItem, SearchUserItem } from '@/lib/weibo/data/weibo-data'

interface SearchCardProps {
  className?: string
  variant?: 'rail' | 'column'
  columnQuery?: string
  columnActiveQuery?: string
  onColumnQueryChange?: (query: string) => void
  onColumnActiveQueryChange?: (query: string) => void
}

function userProfilePath(user: SearchUserItem) {
  const id = user.idstr || user.uid
  return `/n/${encodeURIComponent(user.screen_name || id)}`
}

function UserResult({ user, column = false }: { user: SearchUserItem; column?: boolean }) {
  const name = user.name || user.screen_name
  const statusText = user.status?.text?.trim()

  return (
    <Link
      to={userProfilePath(user)}
      className={cn(
        'group flex min-w-0 items-start gap-3 transition-colors',
        column
          ? 'rounded-xl px-3 py-3 hover:bg-accent/70 focus-visible:bg-accent/70 focus-visible:outline-none'
          : 'py-2',
      )}
    >
      <Avatar className={cn(column ? 'size-10' : 'h-8 w-8', 'shrink-0')}>
        <AvatarImage src={user.avatar_large || user.profile_image_url} alt={name} />
        <AvatarFallback>{name?.slice(0, 1) || '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-sm font-medium break-words group-hover:underline">{name}</span>
          {user.verified ? <span className="text-primary shrink-0 text-xs">认证</span> : null}
        </div>
        <div className="text-muted-foreground text-xs break-words">
          @{user.screen_name || user.idstr}
          {user.followers_count_str ? ` · ${user.followers_count_str} 粉丝` : ''}
        </div>
        {user.description ? (
          <div className="text-muted-foreground mt-1 text-xs leading-relaxed break-words">
            {user.description}
          </div>
        ) : null}
        {column && statusText ? (
          <div className="bg-muted/50 text-muted-foreground mt-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed break-words whitespace-pre-wrap">
            {statusText}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

function HotQueryResult({
  item,
  index,
  column = false,
  onSelect,
}: {
  item: SearchHotQueryItem
  index: number
  column?: boolean
  onSelect?: () => void
}) {
  const xbTopicPage = useAppSettings((s) => s.features.xbTopicPage)
  const content = (
    <>
      <span
        className={cn(
          'shrink-0 text-xs font-medium tabular-nums',
          index < 3 ? 'text-orange-500' : 'text-muted-foreground',
          column ? 'w-5 text-center' : 'w-4',
        )}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 text-sm break-words">{item.suggestion}</span>
    </>
  )
  const className = cn(
    'group flex w-full min-w-0 items-center gap-2 transition-colors',
    column
      ? 'rounded-lg px-2.5 py-2 hover:bg-accent/70 focus-visible:bg-accent/70 focus-visible:outline-none'
      : 'px-2 py-2 hover:bg-accent/80',
  )

  if (column || !xbTopicPage) {
    const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(item.suggestion)}`
    return column ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    ) : (
      <DropdownMenuItem onSelect={onSelect} className={className}>
        {content}
      </DropdownMenuItem>
    )
  }

  return (
    <Link
      to={`/topic?q=${encodeURIComponent(item.suggestion)}`}
      onClick={onSelect}
      className={className}
    >
      <DropdownMenuItem className="w-full">{content}</DropdownMenuItem>
    </Link>
  )
}

function SearchColumnResults({
  query,
  data,
  isLoading,
  isError,
}: {
  query: string
  data: { hotQueries: SearchHotQueryItem[]; users: SearchUserItem[] } | undefined
  isLoading: boolean
  isError: boolean
}) {
  if (!query) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
        <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-2xl">
          <Search className="text-muted-foreground size-5" />
        </div>
        <p className="text-sm font-medium">搜索微博与用户</p>
        <p className="text-muted-foreground mt-1 text-xs">输入关键词，发现热门话题和相关用户</p>
      </div>
    )
  }
  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  if (isError)
    return (
      <p className="text-muted-foreground px-4 py-8 text-center text-sm">搜索失败，请稍后重试</p>
    )

  const hotQueries = data?.hotQueries ?? []
  const users = data?.users ?? []
  if (hotQueries.length === 0 && users.length === 0) {
    return <p className="text-muted-foreground px-4 py-12 text-center text-sm">没有找到相关结果</p>
  }

  return (
    <div className="space-y-5 px-2 py-4">
      {users.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between px-2">
            <h2 className="text-sm font-semibold">相关用户</h2>
            <span className="text-muted-foreground text-xs">{users.length} 位</span>
          </div>
          <div className="divide-border/60 divide-y">
            {users.map((user) => (
              <UserResult key={user.uid || user.idstr} user={user} column />
            ))}
          </div>
        </section>
      ) : null}
      {hotQueries.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between px-2">
            <h2 className="text-sm font-semibold">热门话题</h2>
            <span className="text-muted-foreground text-xs">{hotQueries.length} 条</span>
          </div>
          <div className="space-y-0.5">
            {hotQueries.map((item, index) => (
              <HotQueryResult
                key={`${item.suggestion}-${index}`}
                item={item}
                index={index}
                column
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function SearchColumnCard({
  className,
  query: controlledQuery,
  activeQuery: controlledActiveQuery,
  onQueryChange,
  onActiveQueryChange,
}: {
  className?: string
  query?: string
  activeQuery?: string
  onQueryChange?: (query: string) => void
  onActiveQueryChange?: (query: string) => void
}) {
  const [localQuery, setLocalQuery] = useState('')
  const [localActiveQuery, setLocalActiveQuery] = useState('')
  const query = controlledQuery ?? localQuery
  const activeQuery = controlledActiveQuery ?? localActiveQuery
  const setQuery = onQueryChange ?? setLocalQuery
  const setActiveQuery = onActiveQueryChange ?? setLocalActiveQuery
  const inputRef = useRef<HTMLInputElement>(null)
  const searchQuery = useQuery(searchQueryOptions(activeQuery))

  const handleSearch = () => {
    const nextQuery = query.trim()
    if (nextQuery) setActiveQuery(nextQuery)
  }
  const handleClear = () => {
    setQuery('')
    setActiveQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('flex min-h-full flex-col', className)}>
      <form
        className="bg-background/95 sticky top-16 z-20 border-b px-3 py-3 supports-backdrop-filter:backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault()
          handleSearch()
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              ref={inputRef}
              placeholder="搜索微博、话题或用户"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 rounded-lg pr-8 pl-9"
              aria-label="搜索微博、话题或用户"
            />
            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
                aria-label="清除搜索"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Button type="submit" size="sm" className="shrink-0" disabled={!query.trim()}>
            搜索
          </Button>
        </div>
        {activeQuery ? (
          <div className="text-muted-foreground mt-2 flex items-center gap-1 px-1 text-xs">
            <span>搜索结果</span>
            <span>·</span>
            <span className="text-foreground font-medium">{activeQuery}</span>
          </div>
        ) : null}
      </form>
      <SearchColumnResults
        query={activeQuery}
        data={searchQuery.data}
        isLoading={searchQuery.isLoading}
        isError={searchQuery.isError}
      />
    </div>
  )
}

export function SearchCard({
  className,
  variant = 'rail',
  columnQuery,
  columnActiveQuery,
  onColumnQueryChange,
  onColumnActiveQueryChange,
}: SearchCardProps) {
  if (variant === 'column') {
    return (
      <SearchColumnCard
        className={className}
        query={columnQuery}
        activeQuery={columnActiveQuery}
        onQueryChange={onColumnQueryChange}
        onActiveQueryChange={onColumnActiveQueryChange}
      />
    )
  }

  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchQuery = useQuery(searchQueryOptions(activeQuery))
  const handleSearch = () => {
    if (query.trim()) {
      setActiveQuery(query.trim())
      setOpen(true)
    }
  }
  const handleClear = () => {
    setQuery('')
    setActiveQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }
  const users = searchQuery.data?.users ?? []
  const hotQueries = searchQuery.data?.hotQueries ?? []

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <form
          className="flex w-full items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault()
            handleSearch()
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Input
              ref={inputRef}
              placeholder="搜索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch()
              }}
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleClear}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <X />
                <span className="sr-only">Clear</span>
              </Button>
            ) : null}
          </div>
          <Button type="submit" variant="outline" size="icon" disabled={!query.trim()}>
            <Search />
          </Button>
          <DropdownMenuTrigger className="absolute bottom-0 w-full" />
        </form>
        <DropdownMenuContent align="end" className="w-80">
          {activeQuery ? (
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() =>
                  window.open(
                    `https://s.weibo.com/weibo?q=${encodeURIComponent(activeQuery)}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                <span className="truncate">“{activeQuery}”相关微博</span>
                <ArrowUpRightIcon />
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : null}
          {searchQuery.isLoading ? (
            <DropdownMenuItem>
              <Spinner />
            </DropdownMenuItem>
          ) : searchQuery.isError ? (
            <DropdownMenuItem>搜索失败</DropdownMenuItem>
          ) : (
            <>
              {hotQueries.length > 0 ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">热搜</DropdownMenuLabel>
                  {hotQueries.slice(0, 10).map((item, index) => (
                    <HotQueryResult
                      key={`${item.suggestion}-${index}`}
                      item={item}
                      index={index}
                      onSelect={() => setOpen(false)}
                    />
                  ))}
                </DropdownMenuGroup>
              ) : null}
              {users.length > 0 ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">用户</DropdownMenuLabel>
                  {users.map((user) => (
                    <UserResult key={user.uid || user.idstr} user={user} />
                  ))}
                </DropdownMenuGroup>
              ) : null}
              {!activeQuery && hotQueries.length === 0 && users.length === 0 ? (
                <DropdownMenuItem>无结果</DropdownMenuItem>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
