import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { DialogContainer } from '@/lib/weibo/components/dialog-container'
import { FeedList } from '@/lib/weibo/components/feed-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type {
  FeedItem,
  StatusDetailNavigationItem,
  TimelinePage,
  TopicChannel,
} from '@/lib/weibo/models/feed'
import {
  extractTopicChannels,
  extractTopicHeadData,
  flattenInfiniteItems,
  topicSearchInfiniteOptions,
} from '@/lib/weibo/queries/weibo-queries'

type ProfileLookup = { uid: string } | { screenName: string }

interface TopicDialogProps {
  open: boolean
  topic: string | null
  position: string
  width?: number
  zIndex?: number
  onOpenChange: (open: boolean) => void
  setComposeTarget: (target: ComposeTarget | null) => void
  onNavigate: (item: StatusDetailNavigationItem) => void
  onNavigateProfile: (lookup: ProfileLookup) => void
}

function TopicChannelBar({
  channels,
  selectedId,
  onSelect,
}: {
  channels: TopicChannel[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="border-border/40 flex w-full scrollbar-none gap-1.5 overflow-x-auto border-b px-1 py-2">
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

export function TopicDialog({
  open,
  topic,
  position,
  width,
  zIndex,
  onOpenChange,
  setComposeTarget,
  onNavigate,
  onNavigateProfile,
}: TopicDialogProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string>('1')

  const isEnabled = open && !!topic

  const topicQuery = useInfiniteQuery({
    ...topicSearchInfiniteOptions(topic ?? '', selectedChannelId),
    enabled: isEnabled,
  })

  const items = useMemo(
    () => flattenInfiniteItems<FeedItem>(topicQuery.data?.pages as TimelinePage[] | undefined),
    [topicQuery.data?.pages],
  )

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

  const errorMessage = topicQuery.error instanceof Error ? topicQuery.error.message : null
  const hasNextPage = Boolean(topicQuery.hasNextPage)
  const isFetchingNextPage = topicQuery.isFetchingNextPage
  const isLoading = topicQuery.isLoading

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void topicQuery.fetchNextPage()
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, topicQuery])

  useEffect(() => {
    if (!open) {
      setSelectedChannelId('1')
    }
  }, [open])

  if (!open || !topic) {
    return null
  }

  return (
    <DialogContainer
      open={open}
      position={position as any}
      width={width}
      zIndex={zIndex}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col gap-3">
        <div className="bg-muted/80 sticky top-0 z-10 -mx-4 -mt-4 backdrop-blur">
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

        {isLoading ? <PageLoadingState label="正在加载话题内容..." /> : null}
        {!isLoading && errorMessage ? (
          <PageErrorState description={errorMessage} onRetry={() => void topicQuery.refetch()} />
        ) : null}
        {!isLoading && !errorMessage ? (
          <FeedList
            items={items}
            emptyLabel="暂无话题内容"
            onNavigate={onNavigate}
            onNavigateProfile={onNavigateProfile}
            onCommentClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
            onRepostClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
          />
        ) : null}
        {hasNextPage ? (
          <div ref={loadMoreRef} className="flex justify-center py-3">
            {isFetchingNextPage ? <Spinner size="sm" /> : null}
          </div>
        ) : null}
      </div>
    </DialogContainer>
  )
}
