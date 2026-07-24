import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { MweiboCaptchaPrompt } from '@/lib/weibo/components/mweibo-captcha-prompt'
import {
  extractTopicChannels,
  extractTopicHeadData,
  topicSearchInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { TimelinePage, TopicChannel } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import { MweiboCaptchaError } from '@/lib/weibo/services/mweibo-errors'

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

export function TopicPage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const topic = page.kind === 'topic' ? page.topic : ''
  const isEnabled = rewriteEnabled && page.kind === 'topic' && topic !== ''

  const [selectedChannelId, setSelectedChannelId] = useState<string>('1')

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

  const errorMessage =
    topicQuery.error instanceof Error && !topicQuery.isFetchNextPageError
      ? topicQuery.error.message
      : null
  const loadMoreErrorMessage =
    topicQuery.error instanceof Error && topicQuery.isFetchNextPageError
      ? topicQuery.error.message
      : null
  const hasNextPage = Boolean(topicQuery.hasNextPage)
  const isFetchingNextPage = topicQuery.isFetchingNextPage
  const isLoading = topicQuery.isLoading

  const captchaError = useMemo(
    () => (topicQuery.error instanceof MweiboCaptchaError ? topicQuery.error : null),
    [topicQuery.error],
  )

  if (captchaError) {
    return (
      <div className="flex flex-col gap-3">
        <MweiboCaptchaPrompt onRetry={() => void topicQuery.refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted/80 sticky top-0 z-10 backdrop-blur">
        <div className="gap-0.5 px-4 py-3">
          <h2 className="text-lg font-semibold">#{topic}#</h2>
          {headData ? (
            <div className="text-muted-foreground flex gap-2 text-xs">
              {headData.midtext ? (
                <span>{headData.midtext.replace(/\s+详情\s*>/g, '')}</span>
              ) : null}
              {headData.downtext ? <span>{headData.downtext}</span> : null}
            </div>
          ) : null}
        </div>
        {channels.length > 0 ? (
          <TopicChannelBar
            channels={channels}
            selectedId={selectedChannelId}
            onSelect={handleChannelSelect}
          />
        ) : null}
      </div>

      <InfiniteFeedList
        pages={topicQuery.data?.pages as TimelinePage[] | undefined}
        emptyLabel="暂无话题内容"
        loadingLabel="正在加载话题内容..."
        errorMessage={errorMessage}
        loadMoreErrorMessage={loadMoreErrorMessage}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={topicQuery.fetchNextPage}
        onRetry={() => void topicQuery.refetch()}
        onNavigate={ctx.navigateToStatusDetail}
        onCommentClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
        onRepostClick={(item) => ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
      />
    </div>
  )
}
