import { useQuery } from '@tanstack/react-query'
import { ChevronUp, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { CommentBox } from '@/lib/weibo/components/comment-box'
import { CommentList } from '@/lib/weibo/components/comment-list'
import { PageLoadingState } from '@/lib/weibo/components/page-state'
import { feedCommentsQueryOptions } from '@/lib/weibo/data/weibo-data'
import type { FeedItem } from '@/lib/weibo/models/feed'
import type { CommentItem } from '@/lib/weibo/models/status'

interface FeedCommentsExpandedProps {
  id?: string
  item: FeedItem
  onCommentReply: (target: import('@/lib/weibo/models/compose').ComposeTarget) => void
  onCollapse?: () => void
}

export function FeedCommentsExpanded({
  id,
  item,
  onCommentReply,
  onCollapse,
}: FeedCommentsExpandedProps) {
  const commentsQuery = useQuery(feedCommentsQueryOptions(item.id, item.author.id))

  const comments = (commentsQuery.data?.items ?? []) as CommentItem[]
  const totalNumber = commentsQuery.data?.totalNumber ?? 0

  return (
    <div
      id={id}
      className="flex cursor-default flex-col gap-3 border-t px-4 pt-3"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <CommentBox
        target={{
          kind: 'status',
          mode: 'comment',
          statusId: item.id,
          targetCommentId: null,
          authorName: item.author.name,
          excerpt: item.text.trim().slice(0, 80),
        }}
        placeholder="写下你的评论"
        compact
      />

      {commentsQuery.isLoading ? (
        <PageLoadingState label="正在加载评论..." />
      ) : comments.length > 0 ? (
        <>
          <h4 className="text-muted-foreground text-xs font-medium">精选评论</h4>
          <CommentList
            comments={comments}
            emptyLabel="暂无评论"
            rootStatusId={item.id}
            authorUid={item.author.id}
            onCommentReply={onCommentReply}
          />
          <div className="flex gap-2">
            {totalNumber > 0 && (
              <Link to={`/${item.author.id}/${item.mblogId}`} className="flex-1">
                <Button variant="ghost" className="text-primary w-full gap-2">
                  <MessageCircle className="size-3.5" />
                  查看全部 {totalNumber} 条评论
                </Button>
              </Link>
            )}
            {onCollapse && (
              <Button
                variant="ghost"
                className="text-muted-foreground gap-2"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCollapse()
                }}
              >
                <ChevronUp className="size-3.5" />
                收起评论
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground px-2 text-center text-xs">还没有评论，快来抢沙发吧</p>
      )}
    </div>
  )
}
