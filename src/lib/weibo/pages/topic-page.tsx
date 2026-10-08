import { useInfiniteQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useAppSettings } from '@/lib/app-settings-store'
import { useImmersiveHeaderClassName } from '@/lib/weibo/app/immersive-header'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { MweiboTopicRecoveryPrompt } from '@/lib/weibo/components/mweibo-topic-recovery-prompt'
import {
  extractTopicChannels,
  extractTopicHeadData,
  getMweiboTopicRecoveryState,
  topicSearchInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import type { TimelinePage, TopicChannel } from '@/lib/weibo/models/feed'
import { useColumnControls } from '@/lib/weibo/workspace/column-controls'

function TopicChannelBar({
  channels,
  selectedId,
  onSelect,
}: {
  channels: TopicChannel[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={scrollRef}
      className="border-border/40 flex w-full scrollbar-none gap-1.5 overflow-x-auto border-b px-1 py-2"
    >
      {channels.map((ch) => (
        <TopicChannelPill
          key={ch.id}
          label={ch.name}
          isActive={selectedId === ch.id}
          onClick={() => onSelect(ch.id)}
        />
      ))}
    </div>
  )
}

function TopicChannelPill({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

export function TopicPage({
  source,
}: {
  source?: { topic: string; channelType?: string }
} = {}) {
  const runtime = usePageRuntime()
  const page = runtime.page
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const columnControls = useColumnControls()
  const headerClassName = useImmersiveHeaderClassName('bg-muted/80 sticky top-0 z-10 backdrop-blur')

  const topic = source?.topic ?? (page.kind === 'topic' ? page.topic : '')
  const isEnabled =
    rewriteEnabled && (source !== undefined || page.kind === 'topic') && topic !== ''

  const [selectedChannelId, setSelectedChannelId] = useState<string>(source?.channelType ?? '1')

  const topicQuery = useInfiniteQuery({
    ...topicSearchInfiniteOptions(topic, selectedChannelId),
    enabled: isEnabled,
  })

  const channels = useMemo(
    () => extractTopicChannels(topicQuery.data?.pages as TimelinePage[] | undefined),
    [topicQuery.data?.pages],
  )

  const headData = useMemo(
    () => extractTopicHeadData(topicQuery.data?.pages as TimelinePage[] | undefined),
    [topicQuery.data?.pages],
  )

  const handleChannelSelect = useCallback((id: string) => {
    setSelectedChannelId(id)
  }, [])

  const isInitialError = topicQuery.error instanceof Error && !topicQuery.isFetchNextPageError
  const isLoadMoreError = topicQuery.error instanceof Error && topicQuery.isFetchNextPageError
  const errorMessage = isInitialError ? '话题内容加载失败，请稍后重试。' : null
  const loadMoreErrorMessage = isLoadMoreError ? '微博暂时无法加载更多话题内容。' : null
  const hasNextPage = Boolean(topicQuery.hasNextPage)
  const isFetchingNextPage = topicQuery.isFetchingNextPage
  const isLoading = topicQuery.isLoading

  const recovery = isInitialError ? getMweiboTopicRecoveryState(topicQuery.error) : null

  return (
    <div className="flex flex-col gap-3">
      <div className={headerClassName}>
        <div className="flex items-start gap-1 px-2 py-3">
          {columnControls}
          <div className="min-w-0 flex-1 gap-0.5">
            <h2 className="truncate text-lg font-semibold">#{topic}#</h2>
            {headData ? (
              <div className="text-muted-foreground flex gap-2 text-xs">
                {headData.midtext ? (
                  <span>{headData.midtext.replace(/\s+详情\s*>/g, '')}</span>
                ) : null}
                {headData.downtext ? <span>{headData.downtext}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        {!source && channels.length > 0 ? (
          <TopicChannelBar
            channels={channels}
            selectedId={selectedChannelId}
            onSelect={handleChannelSelect}
          />
        ) : null}
      </div>

      {recovery ? (
        <MweiboTopicRecoveryPrompt recovery={recovery} onRetry={() => void topicQuery.refetch()} />
      ) : (
        <InfiniteFeedList
          scrollRootRef={runtime.scrollRootRef}
          pages={topicQuery.data?.pages as TimelinePage[] | undefined}
          emptyLabel="暂无话题内容"
          loadingLabel="正在加载话题内容…"
          errorMessage={errorMessage}
          loadMoreErrorMessage={loadMoreErrorMessage}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={topicQuery.fetchNextPage}
          onRetry={() => void topicQuery.refetch()}
        />
      )}
    </div>
  )
}
