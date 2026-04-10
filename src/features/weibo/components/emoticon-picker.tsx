import { Smile } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmoticonConfigQuery } from '@/features/weibo/app/emoticon-query'
import { useRecentEmoticons } from '@/features/weibo/app/recent-emoticons-store'

interface EmoticonEntry {
  phrase: string
  url: string
}

export function EmoticonPicker({ onSelect }: { onSelect: (entry: EmoticonEntry) => void }) {
  const [open, setOpen] = useState(false)
  const { data } = useEmoticonConfigQuery()
  console.log('🚀 ~ EmoticonPicker ~ data:', data)

  const isHydrated = useRecentEmoticons((state) => state.isHydrated)
  const hydrate = useRecentEmoticons((state) => state.hydrate)
  const recentItems = useRecentEmoticons((state) => state.items)
  const remember = useRecentEmoticons((state) => state.remember)

  useEffect(() => {
    if (!isHydrated) {
      void hydrate()
    }
  }, [hydrate, isHydrated])

  const groups = [{ title: '最近', items: recentItems }, ...(data?.groups ?? [])]
  const defaultTab = groups[0]?.title ?? '最近'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Smile className="size-4" />
          表情
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] p-3">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-3 flex w-full overflow-x-auto">
            {groups.map((group) => (
              <TabsTrigger key={group.title} value={group.title}>
                {group.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => (
            <TabsContent key={group.title} value={group.title}>
              <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto">
                {group.items.map((item) => (
                  <button
                    key={`${group.title}-${item.phrase}`}
                    type="button"
                    className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted"
                    onClick={() => {
                      void remember(item)
                      onSelect(item)
                      setOpen(false)
                    }}
                  >
                    <img alt={item.phrase} className="size-7" src={item.url} />
                    <span className="text-[10px] leading-4">{item.phrase}</span>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
