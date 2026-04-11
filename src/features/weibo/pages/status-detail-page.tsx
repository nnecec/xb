import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CommentList } from '@/features/weibo/components/comment-list'
import { FeedCard } from '@/features/weibo/components/feed-card'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { FeedItem } from '@/features/weibo/models/feed'
import type { CommentFilterOption, CommentItem, StatusDetail } from '@/features/weibo/models/status'

function createStatusComposeTarget({
  detail,
  mode,
}: {
  detail: StatusDetail
  mode: 'comment' | 'repost'
}): ComposeTarget {
  return {
    kind: 'status',
    mode,
    statusId: detail.status.id,
    targetCommentId: null,
    authorName: detail.status.author.name,
    excerpt: detail.status.text.trim().slice(0, 80),
  }
}

export function StatusDetailPage({
  detail,
  comments,
  hasNextPage,
  isFetchingNextPage,
  onLoadNextPage,
  onStatusComment,
  onStatusRepost,
  onCommentReply,
  onNavigate,
  filterGroup,
  filterParam,
  onFilterChange,
}: {
  detail: StatusDetail
  comments: CommentItem[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadNextPage: () => void
  onStatusComment?: (target: ComposeTarget) => void
  onStatusRepost?: (target: ComposeTarget) => void
  onCommentReply?: (target: ComposeTarget) => void
  onNavigate?: (item: FeedItem) => void
  filterGroup?: CommentFilterOption[]
  filterParam?: string
  onFilterChange?: (param: string) => void
}) {
  const selectedFilter = filterGroup?.find((f) => f.param === filterParam) ?? filterGroup?.[0]

  return (
    <div className="flex flex-col gap-4">
      <FeedCard
        item={detail.status}
        onNavigate={onNavigate}
        onCommentClick={() =>
          onStatusComment?.(createStatusComposeTarget({ detail, mode: 'comment' }))
        }
        onRepostClick={() =>
          onStatusRepost?.(createStatusComposeTarget({ detail, mode: 'repost' }))
        }
      />
      {filterGroup && filterGroup.length > 0 && selectedFilter && (
        <Select value={selectedFilter.param} onValueChange={(value) => onFilterChange?.(value)}>
          <SelectTrigger size="sm" className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterGroup.map((filter) => (
              <SelectItem key={filter.param} value={filter.param}>
                {filter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <CommentList
        comments={comments}
        emptyLabel="No replies are available for this post yet."
        rootStatusId={detail.status.id}
        onCommentReply={onCommentReply}
        onNavigate={onNavigate}
      />
      {hasNextPage ? (
        <Button variant="outline" onClick={onLoadNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载下一页评论'}
        </Button>
      ) : null}
    </div>
  )
}
