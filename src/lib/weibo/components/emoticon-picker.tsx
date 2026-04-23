import { Smile, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmoticonConfigQuery } from '@/lib/weibo/app/emoticon-query'
import { useRecentEmoticons } from '@/lib/weibo/app/recent-emoticons-store'

interface EmoticonEntry {
  phrase: string
  url: string
}

export function EmoticonPicker({ onSelect }: { onSelect: (entry: EmoticonEntry) => void }) {
  const [open, setOpen] = useState(false)
  const { data } = useEmoticonConfigQuery()

  const isHydrated = useRecentEmoticons((state) => state.isHydrated)
  const hydrate = useRecentEmoticons((state) => state.hydrate)
  const recentItems = useRecentEmoticons((state) => state.items)
  const remember = useRecentEmoticons((state) => state.remember)
  const clearRecent = useRecentEmoticons((state) => state.clear)

  useEffect(() => {
    if (!isHydrated) {
      void hydrate()
    }
  }, [hydrate, isHydrated])

  const defaultTab = data?.groups[0]?.title
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Smile className="size-4" />
          表情
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-3" align="start">
        {recentItems.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-xs">最近使用</div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  void clearRecent()
                }}
              >
                <Trash />
              </Button>
            </div>
            <div className="grid max-h-56 grid-cols-10 gap-1 overflow-y-auto">
              {recentItems.map((item) => (
                <Button
                  variant="ghost"
                  key={`${item.phrase}`}
                  size="icon"
                  onClick={() => {
                    void remember(item)
                    onSelect(item)
                    setOpen(false)
                  }}
                >
                  <img alt={item.phrase} className="size-5" src={item.url} />
                </Button>
              ))}
            </div>
          </>
        )}
        <Tabs defaultValue={defaultTab}>
          <TabsList className="my-1 flex w-full overflow-x-auto">
            {data?.groups.map((group) => (
              <TabsTrigger key={group.title} value={group.title} className="gap-1 px-2 py-1.5">
                <img alt="" className="size-5" src={group.items[0].url} />
                <span className="sr-only">{group.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {data?.groups.map((group) => (
            <TabsContent key={group.title} value={group.title}>
              <div className="grid max-h-56 grid-cols-10 gap-1 overflow-y-auto">
                {group.items.map((item) => (
                  <Button
                    variant="ghost"
                    key={`${group.title}-${item.phrase}`}
                    size="icon"
                    onClick={() => {
                      void remember(item)
                      onSelect(item)
                      setOpen(false)
                    }}
                  >
                    <img alt={item.phrase} className="size-5" src={item.url} />
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
