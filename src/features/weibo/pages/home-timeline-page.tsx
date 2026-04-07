import type { TimelinePage } from '@/features/weibo/models/feed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'

export function HomeTimelinePage({
  activeTab,
  isLoading,
  errorMessage,
  onRetry,
  onTabChange,
  page,
}: {
  activeTab: 'for-you' | 'following'
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
  onTabChange: (value: 'for-you' | 'following') => void
  page: TimelinePage
}) {
  return (
    <Tabs
      value={activeTab}
      className="flex flex-col gap-4"
      onValueChange={(value) => onTabChange(value as 'for-you' | 'following')}
    >
      <TabsList className="grid w-full grid-cols-2 rounded-full">
        <TabsTrigger value="for-you">For You</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="flex flex-col gap-3">
        {isLoading ? <PageLoadingState label="Loading your Weibo timeline..." /> : null}
        {!isLoading && errorMessage ? (
          <PageErrorState description={errorMessage} onRetry={onRetry} />
        ) : null}
        {!isLoading && !errorMessage && page.items.length === 0 ? (
          <PageEmptyState label="No posts are available for this timeline yet." />
        ) : null}
        {!isLoading && !errorMessage
          ? page.items.map((item) => <FeedCard key={item.id} item={item} />)
          : null}
      </TabsContent>
    </Tabs>
  )
}
