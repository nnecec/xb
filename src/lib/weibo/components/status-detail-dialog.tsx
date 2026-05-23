import { useQuery } from '@tanstack/react-query'

import { DialogContainer } from '@/lib/weibo/components/dialog-container'
import { FeedCard } from '@/lib/weibo/components/feed-card'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { FeedItem, StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import { StatusCommentsSection } from '@/lib/weibo/pages/status-detail-page'
import { loadStatusDetail } from '@/lib/weibo/services/weibo-repository'

type ProfileLookup = { uid: string } | { screenName: string }

interface StatusDetailDialogProps {
  open: boolean
  item: StatusDetailNavigationItem | null
  position: string
  width?: number
  zIndex?: number
  onOpenChange: (open: boolean) => void
  setComposeTarget: (target: ComposeTarget | null) => void
  onNavigate?: (item: FeedItem) => void
  onNavigateProfile?: (lookup: ProfileLookup) => void
  onNavigateTopic?: (topic: string) => void
}

export function StatusDetailDialog({
  open,
  item,
  position,
  width,
  zIndex,
  onOpenChange,
  setComposeTarget,
  onNavigate,
  onNavigateProfile,
  onNavigateTopic,
}: StatusDetailDialogProps) {
  if (!open || !item) {
    return null
  }

  const statusId = item.mblogId ?? item.id
  const authorId = item.author.id

  const detailQuery = useQuery({
    queryKey: ['weibo', 'status', statusId],
    queryFn: () => loadStatusDetail(statusId),
    enabled: statusId !== '',
  })

  const detail = detailQuery.data
  const commentsZIndex = zIndex != null ? zIndex + 1 : undefined

  return (
    <DialogContainer
      open={open}
      position={position as any}
      width={width}
      zIndex={zIndex}
      onOpenChange={onOpenChange}
    >
      {detailQuery.isLoading ? <PageLoadingState label="正在加载此微博..." /> : null}
      {detailQuery.error instanceof Error ? (
        <PageErrorState description={detailQuery.error.message} />
      ) : null}
      {detail ? (
        <div className="flex flex-col gap-4">
          <FeedCard
            item={detail.status}
            surface="detail"
            onNavigate={onNavigate}
            onNavigateProfile={onNavigateProfile}
            onNavigateTopic={onNavigateTopic}
            onCommentClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
            onRepostClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
            onStatusDeleted={() => onOpenChange(false)}
          />
          <div className="border-t pt-4">
            <h3 className="text-muted-foreground mb-4 text-sm font-medium">评论</h3>
            <StatusCommentsSection
              statusId={detail.status.id}
              authorId={authorId}
              zIndex={commentsZIndex}
              onCommentReply={setComposeTarget}
            />
          </div>
        </div>
      ) : null}
    </DialogContainer>
  )
}
