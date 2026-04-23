import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'

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
import { searchQueryOptions } from '@/features/weibo/queries/weibo-queries'
import { cn } from '@/lib/utils'

interface SearchCardProps {
  className?: string
}

export function SearchCard({ className }: SearchCardProps) {
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const searchQuery = useQuery(searchQueryOptions(activeQuery))

  const handleSearch = () => {
    if (query.length) {
      setActiveQuery(query)
      setOpen(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleClear = () => {
    console.log('🚀 ~ handleClear ~ handleClear:')
    setQuery('')
    setActiveQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleUserClick = (screenName: string) => {
    navigate(`/n/${encodeURIComponent(screenName)}`)
    setOpen(false)
  }

  const handleHotQueryClick = (suggestion: string) => {
    window.open(
      `https://s.weibo.com/weibo?q=${encodeURIComponent(suggestion)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setOpen(false)
  }

  const topHotQueries = searchQuery.data?.hotQueries.slice(0, 10) ?? []
  const users = searchQuery.data?.users ?? []
  const hasResults = topHotQueries.length > 0 || users.length > 0

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <div className="flex w-full items-center gap-1">
          <div className="relative flex-1">
            <Input
              placeholder="搜索"
              value={query}
              onChange={(e) => setQuery(e.target.value.trim())}
              onKeyDown={handleKeyDown}
            />
            {query.length > 0 && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleClear}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <X />
                <span className="sr-only">Clear</span>
              </Button>
            )}
          </div>

          <Button variant="outline" size="icon" onClick={handleSearch} disabled={!query.length}>
            <Search />
          </Button>
          <DropdownMenuTrigger className="absolute bottom-0 w-full" />
        </div>

        <DropdownMenuContent align="end" className="w-80">
          {searchQuery.isLoading ? (
            <DropdownMenuItem>
              <Spinner />
            </DropdownMenuItem>
          ) : searchQuery.isError ? (
            <DropdownMenuItem>搜索失败</DropdownMenuItem>
          ) : !hasResults ? (
            <DropdownMenuItem>无结果</DropdownMenuItem>
          ) : (
            <>
              {topHotQueries.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">热搜</DropdownMenuLabel>
                  {topHotQueries.map((item, index) => (
                    <DropdownMenuItem
                      key={`hot-${index}`}
                      onSelect={() => handleHotQueryClick(item.suggestion)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-muted-foreground w-4 text-xs tabular-nums">
                        {index + 1}
                      </span>
                      <span className="truncate">{item.suggestion}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              )}

              {users.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">用户</DropdownMenuLabel>
                  {users.map((user) => (
                    <DropdownMenuItem
                      key={user.uid}
                      onSelect={() => handleUserClick(user.screen_name)}
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_image_url} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {user.name}
                          <span className="text-muted-foreground ml-2 truncate text-xs">
                            {user.followers_count_str} 粉丝
                          </span>
                        </div>

                        <div className="text-muted-foreground truncate text-xs">
                          {user.description}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
