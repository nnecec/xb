import { HotSearchCard } from '@/lib/weibo/components/hotsearch-list'
import { SearchCard } from '@/lib/weibo/components/search-card'
import { SuperTopicCard } from '@/lib/weibo/components/super-topic-card'

export function RightRail() {
  return (
    <div className="flex h-full w-full flex-col justify-between py-4">
      <div className="flex flex-col gap-3">
        <SearchCard />
        <HotSearchCard className="gap-2 p-2" />
        <SuperTopicCard className="gap-2 p-2" />
      </div>
    </div>
  )
}
